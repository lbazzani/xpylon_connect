import OpenAI from "openai";
import prisma from "./prisma";
import { generateAndSaveEmbedding, findSimilarUsers, formatSuggestionForBot } from "./matching";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

const BOT_PHONE = process.env.XPYLON_BOT_PHONE || "+10000000000";
const MODEL = "gpt-4o-mini";

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

Rules:
- Always respond in English
- Keep messages SHORT (2-3 sentences max per message)
- Be conversational, not robotic
- Ask ONE question at a time
- When the user provides profile info, acknowledge it and move to the next topic naturally
- Never ask for sensitive data (passwords, payment info)
- If the user wants to skip something, respect that immediately
- Use the user's first name when you know it
- Don't use emojis excessively — max 1 per message, and only when appropriate`;

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
