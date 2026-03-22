import OpenAI from "openai";
import fs from "fs";
import prisma from "./prisma";
import { getBotUserId } from "./bot";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
});

export interface StructuredSummary {
  topicsDiscussed: string[];
  keyDecisions: string[];
  nextSteps: string[];
  flaggedContent?: string;
}

const SUMMARY_PROMPT = `You are a professional meeting summarizer for Xpylon Connect, a B2B networking platform.
Analyze the provided content and produce a structured summary focused ONLY on professional/business topics.

IGNORE: personal conversations, greetings, small talk, off-topic discussions.
FLAG: any inappropriate, unethical, or potentially illegal content.

Respond with ONLY a JSON object:
{
  "topicsDiscussed": ["Topic 1", "Topic 2"],
  "keyDecisions": ["Decision 1", "Decision 2"],
  "nextSteps": ["Action item 1 (responsible party, deadline if mentioned)", "Action item 2"],
  "flaggedContent": "Description of any inappropriate content found, or null if none"
}

Keep each item concise (1 sentence max). If there's nothing professional to summarize, return empty arrays.`;

export async function transcribeAudio(filePath: string): Promise<string> {
  const file = fs.createReadStream(filePath);
  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "en",
  });
  return response.text;
}

export async function summarizeText(text: string, context: string = "call"): Promise<StructuredSummary> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SUMMARY_PROMPT },
      { role: "user", content: `${context === "call" ? "Call transcription" : "Chat messages"}:\n\n${text}` },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const reply = completion.choices[0]?.message?.content?.trim();
  if (!reply) {
    return { topicsDiscussed: [], keyDecisions: [], nextSteps: [] };
  }

  try {
    return JSON.parse(reply);
  } catch {
    return { topicsDiscussed: [], keyDecisions: [], nextSteps: [] };
  }
}

export function formatSummaryMessage(summary: StructuredSummary, source: "call" | "chat", durationOrCount: string): string {
  const header = source === "call" ? `Call Summary (${durationOrCount})` : `Chat Summary (${durationOrCount})`;
  const lines: string[] = [header, "━".repeat(30), ""];

  if (summary.topicsDiscussed.length > 0) {
    lines.push("Topics Discussed:");
    summary.topicsDiscussed.forEach((t) => lines.push(`  • ${t}`));
    lines.push("");
  }

  if (summary.keyDecisions.length > 0) {
    lines.push("Key Decisions:");
    summary.keyDecisions.forEach((d) => lines.push(`  • ${d}`));
    lines.push("");
  }

  if (summary.nextSteps.length > 0) {
    lines.push("Next Steps:");
    summary.nextSteps.forEach((s) => lines.push(`  • ${s}`));
    lines.push("");
  }

  if (summary.flaggedContent) {
    lines.push(`⚠ Flagged: ${summary.flaggedContent}`);
  }

  return lines.join("\n");
}

export async function postSummaryToConversation(
  conversationId: string,
  summary: StructuredSummary,
  source: "call" | "chat",
  durationOrCount: string
): Promise<void> {
  const botId = await getBotUserId();
  const content = formatSummaryMessage(summary, source, durationOrCount);

  await prisma.message.create({
    data: {
      conversationId,
      senderId: botId,
      content,
      type: "SYSTEM",
    },
  });

  // If there are next steps, propose follow-up reminders
  if (summary.nextSteps.length > 0) {
    const reminderProposal = summary.nextSteps
      .map((step, i) => `${i + 1}. ${step}`)
      .join("\n");

    await prisma.message.create({
      data: {
        conversationId,
        senderId: botId,
        content: `Would you like me to set reminders for any of these next steps?\n\n${reminderProposal}\n\nJust tell me which ones and when you'd like to be reminded.`,
        type: "TEXT",
      },
    });
  }

  // Notify admins if flagged content
  if (summary.flaggedContent) {
    const { notifyComplianceReview } = await import("./notifications");
    await notifyComplianceReview(
      conversationId,
      `${source === "call" ? "Call" : "Chat"} in conversation`,
      "AI Summary",
      `Flagged content: ${summary.flaggedContent}`
    ).catch(console.error);
  }
}

export async function summarizeConversationMessages(conversationId: string): Promise<StructuredSummary> {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      type: { in: ["TEXT"] },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { sender: true },
  });

  if (messages.length === 0) {
    return { topicsDiscussed: [], keyDecisions: [], nextSteps: [] };
  }

  const text = messages
    .map((m) => `${m.sender.firstName} ${m.sender.lastName}: ${m.content || ""}`)
    .join("\n");

  return summarizeText(text, "chat");
}
