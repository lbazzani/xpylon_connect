import OpenAI from "openai";
import prisma from "./prisma";
import { getBotUserId } from "./bot";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

// Message count thresholds at which we check for auto-naming
const CHECK_THRESHOLDS = [8, 20, 40, 60, 100];

const NAMING_PROMPT = `You analyze business conversations and suggest a short, descriptive topic title.

Rules:
- Return ONLY a JSON object: {"title": "Short Topic Title"} or {"title": null}
- Return null if the conversation is just small talk, greetings, or too vague to categorize
- The title should be 2-5 words, professional, describing the BUSINESS topic discussed
- Examples of good titles: "EU Distribution Partnership", "Series A Investment", "Supply Chain Review", "Product Launch Q3"
- Do NOT include names of people or companies in the title
- Focus on the business opportunity, deal, or project being discussed`;

export async function shouldCheckNaming(conversationId: string): Promise<boolean> {
  // Only check unnamed DIRECT conversations with topic GENERAL
  const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conv) return false;
  if (conv.type !== "DIRECT") return false;
  if (conv.topic !== "GENERAL") return false;
  if (conv.name) return false; // Already named

  const count = await prisma.message.count({
    where: { conversationId, deletedAt: null, type: "TEXT" },
  });

  return CHECK_THRESHOLDS.includes(count);
}

export async function suggestConversationName(conversationId: string): Promise<void> {
  try {
    // Get the last 15 messages
    const messages = await prisma.message.findMany({
      where: { conversationId, deletedAt: null, type: { in: ["TEXT"] } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { sender: true },
    });

    if (messages.length < 5) return;

    const text = messages
      .reverse()
      .map((m) => `${m.sender.firstName}: ${m.content || ""}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: NAMING_PROMPT },
        { role: "user", content: text },
      ],
      max_tokens: 50,
      temperature: 0,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) return;

    const parsed = JSON.parse(reply);
    if (!parsed.title) return;

    const title = parsed.title;
    const botId = await getBotUserId();

    // Send a suggestion message from the bot with parseable markers
    await prisma.message.create({
      data: {
        conversationId,
        senderId: botId,
        content: `This conversation seems to be about "${title}". Would you like to set it as the topic?\n\n[SET_TOPIC:${title}]`,
        type: "SYSTEM",
      },
    });
  } catch (err) {
    console.error("Conversation naming error:", err);
  }
}
