import OpenAI from "openai";
import fs from "fs";
import path from "path";
import prisma from "./prisma";
import { generateAndSaveEmbedding, findSimilarUsers, formatSuggestionForBot } from "./matching";
import { moderateOpportunity } from "./moderation";
import { notifyComplianceReview } from "./notifications";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

const BOT_PHONE = process.env.XPYLON_BOT_PHONE || "+10000000000";
const MODEL = "gpt-4o-mini";

// Load product guide for feature Q&A
let productGuide = "";
try {
  productGuide = fs.readFileSync(
    path.join(__dirname, "../../../storyboard/content.md"),
    "utf-8"
  );
} catch {
  console.warn("Could not load storyboard/content.md for bot context");
}

const SYSTEM_PROMPT = `You are Xpylon, the AI assistant for Xpylon Connect — a B2B professional networking platform. You speak in a warm, professional, and concise tone. You are helpful but never pushy.

Your responsibilities:
1. WELCOME new users when they first join
2. COLLECT profile information naturally through conversation (don't ask everything at once):
   - Job title / role
   - Brief bio (what they do, what they're looking for)
   - Industry they work in
   - What kind of business opportunities they're interested in
3. SUGGEST connections and help users understand the platform
4. ANSWER questions about how Xpylon Connect works
5. SUGGEST connections: When the user asks for connections or seems ready, you can suggest matches.
   Use the phrase "[SUGGEST_MATCHES]" in your response when you want to show suggestions.
   The system will replace this with actual matching results.
6. CREATE OPPORTUNITIES: When in an OPPORTUNITY_CREATION conversation, guide the user step by step:
   a. Ask for the TYPE (partnership, distribution, investment, supply, acquisition, other)
   b. Ask for a TITLE (suggest one based on what they describe)
   c. Ask for a DESCRIPTION (help them write a compelling one, suggest improvements)
   d. Ask for TAGS (suggest relevant ones based on the description)
   e. Ask about VISIBILITY: open (anyone can contact), network (you approve requests), invite-only (you share manually)
   f. Ask about COMMUNICATION: private chats (separate 1:1 with each interested person) or group chat (one shared conversation)
   g. When all info is collected, use "[CREATE_OPPORTUNITY]" followed by JSON with the collected data

   Be helpful — suggest titles, improve descriptions, recommend tags based on their industry.
   Confirm before creating: "Here's a summary of your opportunity: ... Shall I publish it?"

Rules:
- Always respond in English
- Keep messages SHORT (2-3 sentences max per message)
- Be conversational, not robotic
- Ask ONE question at a time
- When the user provides profile info, acknowledge it and move to the next topic naturally
- Never ask for sensitive data (passwords, payment info)
- If the user wants to skip something, respect that immediately
- Use the user's first name when you know it
- Don't use emojis excessively — max 1 per message, and only when appropriate
- When users ask how the app works, what features it has, or want a tutorial, refer to the Product Guide below. Suggest they check "How it works" in their Profile menu for an interactive tour.

--- PRODUCT GUIDE ---
${productGuide}`;

async function getOrCreateBotUser() {
  let bot = await prisma.user.findUnique({ where: { phone: BOT_PHONE } });
  if (!bot) {
    bot = await prisma.user.create({
      data: {
        phone: BOT_PHONE,
        firstName: "Xpylon",
        lastName: "Assistant",
        bio: "Your AI-powered networking assistant",
        role: "AI Assistant",
        profileCompleted: true,
        isOnline: true,
      },
    });
  }
  return bot;
}

export async function getBotUserId(): Promise<string> {
  const bot = await getOrCreateBotUser();
  return bot.id;
}

export async function createWelcomeConversation(userId: string): Promise<string> {
  const bot = await getOrCreateBotUser();

  // Check if conversation already exists
  const existing = await prisma.conversation.findFirst({
    where: {
      type: "DIRECT",
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: bot.id } } },
      ],
    },
  });

  if (existing) return existing.id;

  // Create conversation
  const conversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      topic: "PROFILING",
      createdById: bot.id,
      members: {
        create: [{ userId: bot.id }, { userId }],
      },
    },
  });

  // Get user info for personalized welcome
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });
  const name = user?.firstName || "there";

  // Send welcome messages
  const welcomeMessages = [
    `Hi ${name}! 👋 I'm Xpylon, your networking assistant.`,
    `I'm here to help you get the most out of Xpylon Connect — from setting up your profile to finding the right business connections.`,
    user?.firstName
      ? `To get started, what's your role at ${user.company?.name || "your company"}? This helps us match you with relevant professionals.`
      : `First things first — could you tell me your name and what company you work for?`,
  ];

  for (const content of welcomeMessages) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: bot.id,
        content,
        type: "TEXT",
      },
    });
    // Small delay between messages for natural feel
    await new Promise((r) => setTimeout(r, 300));
  }

  return conversation.id;
}

export async function createOpportunityConversation(userId: string): Promise<string> {
  const bot = await getOrCreateBotUser();

  const conversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      topic: "OPPORTUNITY_CREATION",
      createdById: bot.id,
      members: {
        create: [{ userId: bot.id }, { userId }],
      },
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const name = user?.firstName || "there";

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: bot.id,
      content: `Hi ${name}! Let's create a new business opportunity. What kind of opportunity are you looking to share? For example: a partnership, distribution deal, investment, supply contract, or acquisition.`,
      type: "TEXT",
    },
  });

  return conversation.id;
}

export async function generateBotReply(
  conversationId: string,
  userId: string,
  userMessage: string
): Promise<string> {
  const bot = await getOrCreateBotUser();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  // Get conversation history (last 20 messages)
  const history = await prisma.message.findMany({
    where: { conversationId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 20,
    include: { sender: true },
  });

  // Build context about user
  const userContext = [
    user?.firstName ? `Name: ${user.firstName} ${user.lastName}` : null,
    user?.email ? `Email: ${user.email}` : null,
    user?.company ? `Company: ${user.company.name}` : null,
    user?.role ? `Role: ${user.role}` : null,
    user?.bio ? `Bio: ${user.bio}` : null,
    user?.profileCompleted ? "Profile: completed" : "Profile: incomplete",
  ].filter(Boolean).join("\n");

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nCurrent user info:\n${userContext}` },
    ...history.map((msg) => ({
      role: (msg.senderId === bot.id ? "assistant" : "user") as "assistant" | "user",
      content: msg.content || "",
    })),
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 200,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) return "I'm here if you need anything! Just send me a message.";

    // Handle suggestion trigger
    if (reply.includes("[SUGGEST_MATCHES]")) {
      const suggestions = await findSimilarUsers(userId, 3);
      const formatted = formatSuggestionForBot(suggestions);
      return reply.replace("[SUGGEST_MATCHES]", formatted);
    }

    // Handle opportunity creation trigger
    if (reply.includes("[CREATE_OPPORTUNITY]")) {
      try {
        const jsonMatch = reply.match(/\[CREATE_OPPORTUNITY\]\s*(\{[\s\S]*\})/);
        if (jsonMatch) {
          const oppData = JSON.parse(jsonMatch[1]);
          const title = oppData.title || "Untitled Opportunity";
          const description = oppData.description || "";
          const type = oppData.type || "OTHER";
          const tags = oppData.tags || [];
          const oppVisibility = oppData.visibility || "NETWORK";
          const commModeVal = oppData.commMode || "PRIVATE";

          // Run compliance review
          const modResult = await moderateOpportunity(title, description, type, tags);

          if (modResult.decision === "REJECTED") {
            return reply.replace(/\[CREATE_OPPORTUNITY\]\s*\{[\s\S]*\}/,
              `I'm sorry, but this opportunity doesn't meet our platform guidelines: ${modResult.reason}. Please revise the content and try again — I'm happy to help you rework it.`);
          }

          const needsReview = modResult.decision === "UNDER_REVIEW";

          const opp = await prisma.opportunity.create({
            data: {
              authorId: userId,
              title,
              description,
              type,
              tags,
              visibility: oppVisibility,
              commMode: commModeVal,
              status: needsReview ? "UNDER_REVIEW" : "ACTIVE",
              reviewNote: needsReview ? modResult.reason : null,
            },
          });

          // Only create GROUP conversation if approved immediately
          if (!needsReview && commModeVal === "GROUP") {
            await prisma.conversation.create({
              data: {
                type: "OPPORTUNITY_GROUP",
                topic: "OPPORTUNITY_DISCUSSION",
                name: title,
                opportunityName: title,
                opportunityId: opp.id,
                createdById: userId,
                members: { create: [{ userId }] },
              },
            });
          }

          // Update conversation name to reflect the opportunity
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { name: title, opportunityId: opp.id },
          });

          // Notify admins if flagged
          if (needsReview) {
            const authorName = `${user?.firstName || "Unknown"} ${user?.lastName || ""}`.trim();
            notifyComplianceReview(opp.id, title, authorName, modResult.reason).catch(console.error);

            return reply.replace(/\[CREATE_OPPORTUNITY\]\s*\{[\s\S]*\}/,
              `Your opportunity "${title}" has been submitted and is currently under compliance review. Our team will review it shortly — you'll receive a notification once it's approved. This usually takes less than 24 hours.`);
          }

          return reply.replace(/\[CREATE_OPPORTUNITY\]\s*\{[\s\S]*\}/,
            `Your opportunity "${title}" has been published! It's now visible to ${oppVisibility === "OPEN" ? "everyone" : oppVisibility === "NETWORK" ? "matching professionals in the network" : "people you invite"}. You can manage it from the Opportunities tab.`);
        }
      } catch (err) {
        console.error("Opportunity creation error:", err);
        return "I had trouble creating the opportunity. Could you try again?";
      }
    }

    // Update embedding after each message
    await maybeUpdateProfile(userId, userMessage, user);

    return reply;
  } catch (err) {
    console.error("Bot reply error:", err);
    return "Sorry, I'm having a moment. Could you try again?";
  }
}

async function maybeUpdateProfile(
  userId: string,
  _message: string,
  _user: any
): Promise<void> {
  // Regenerate embedding whenever user sends a message to the bot
  // The profile may have been updated via the register/profile endpoints
  await generateAndSaveEmbedding(userId);
}

export async function isBotConversation(conversationId: string): Promise<boolean> {
  const bot = await getOrCreateBotUser();
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: bot.id } },
  });
  return !!member;
}
