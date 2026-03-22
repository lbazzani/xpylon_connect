import prisma from "./prisma";
import { getBotUserId } from "./bot";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export function startReminderCron() {
  // Check for due reminders every 60 seconds
  setInterval(checkDueReminders, 60000);
  console.log("Reminder cron started (60s interval)");
}

async function checkDueReminders(): Promise<void> {
  try {
    const now = new Date();
    const dueReminders = await prisma.reminder.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: now },
      },
      include: {
        user: true,
        conversation: { select: { id: true, name: true } },
      },
    });

    if (dueReminders.length === 0) return;

    const botId = await getBotUserId();

    for (const reminder of dueReminders) {
      try {
        // Post reminder message in conversation
        await prisma.message.create({
          data: {
            conversationId: reminder.conversationId,
            senderId: botId,
            content: `Reminder: ${reminder.content}`,
            type: "TEXT",
          },
        });

        // Send push notification
        const tokens = await prisma.fcmToken.findMany({
          where: { userId: reminder.userId },
        });

        if (tokens.length > 0) {
          const messages = tokens.map((t) => ({
            to: t.token,
            title: "Reminder",
            body: reminder.content,
            data: { type: "reminder", conversationId: reminder.conversationId },
            sound: "default" as const,
            channelId: "reminders",
          }));

          await fetch(EXPO_PUSH_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(messages),
          }).catch(console.error);
        }

        // Mark as sent
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: "SENT", sentAt: now },
        });
      } catch (err) {
        console.error(`Failed to process reminder ${reminder.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Reminder cron error:", err);
  }
}
