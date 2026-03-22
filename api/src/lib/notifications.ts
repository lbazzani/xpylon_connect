import prisma from "./prisma";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
  categoryId?: string;
}

async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Expo recommends batching in chunks of 100
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        console.error("Push notification failed:", await res.text());
      }
    } catch (err) {
      console.error("Push notification error:", err);
    }
  }
}

async function getUserPushTokens(userId: string): Promise<string[]> {
  const tokens = await prisma.fcmToken.findMany({ where: { userId } });
  return tokens.map((t) => t.token);
}

export async function notifyNewMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  content: string | null,
  conversationType: string,
  conversationName?: string
): Promise<void> {
  const members = await prisma.conversationMember.findMany({
    where: { conversationId },
  });

  const messages: PushMessage[] = [];

  for (const member of members) {
    if (member.userId === senderId) continue;

    const tokens = await getUserPushTokens(member.userId);
    const title =
      conversationType === "DIRECT"
        ? senderName
        : conversationName || "Group";
    const body = content
      ? conversationType === "DIRECT"
        ? content
        : `${senderName}: ${content}`
      : `${senderName} sent an attachment`;

    for (const token of tokens) {
      messages.push({
        to: token,
        title,
        body,
        data: { type: "message", conversationId },
        sound: "default",
        priority: "high",
        channelId: "messages",
      });
    }
  }

  await sendPushNotifications(messages);
}

export async function notifyConnectionRequest(
  targetUserId: string,
  fromUser: {
    firstName: string;
    lastName: string;
    company?: { name: string } | null;
  }
): Promise<void> {
  const tokens = await getUserPushTokens(targetUserId);
  const companyText = fromUser.company ? ` from ${fromUser.company.name}` : "";
  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title: "New connection request",
    body: `${fromUser.firstName} ${fromUser.lastName}${companyText} wants to connect`,
    data: { type: "connection_request" },
    sound: "default",
    priority: "high",
    channelId: "connections",
  }));

  await sendPushNotifications(messages);
}

export async function notifyConnectionAccepted(
  targetUserId: string,
  acceptedBy: { firstName: string; lastName: string }
): Promise<void> {
  const tokens = await getUserPushTokens(targetUserId);
  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title: "Connection accepted",
    body: `${acceptedBy.firstName} ${acceptedBy.lastName} accepted your request`,
    data: { type: "connection_accepted" },
    sound: "default",
    channelId: "connections",
  }));

  await sendPushNotifications(messages);
}

export async function notifyIncomingCall(
  conversationId: string,
  callerId: string,
  callerName: string,
  callType: string
): Promise<void> {
  const members = await prisma.conversationMember.findMany({
    where: { conversationId },
  });

  const messages: PushMessage[] = [];

  for (const member of members) {
    if (member.userId === callerId) continue;
    const tokens = await getUserPushTokens(member.userId);
    for (const token of tokens) {
      messages.push({
        to: token,
        title: `Incoming ${callType.toLowerCase()} call`,
        body: `${callerName} is calling...`,
        data: { type: "call", conversationId, callType },
        sound: "default",
        priority: "high",
        channelId: "calls",
      });
    }
  }

  await sendPushNotifications(messages);
}

export async function notifyComplianceReview(
  opportunityId: string,
  opportunityTitle: string,
  authorName: string,
  reason: string
): Promise<void> {
  // Find all admin users
  const admins = await prisma.user.findMany({ where: { isAdmin: true } });

  const messages: PushMessage[] = [];
  for (const admin of admins) {
    const tokens = await getUserPushTokens(admin.id);
    for (const token of tokens) {
      messages.push({
        to: token,
        title: "Compliance review required",
        body: `"${opportunityTitle}" by ${authorName} needs review: ${reason}`,
        data: { type: "compliance_review", opportunityId },
        sound: "default",
        priority: "high",
        channelId: "moderation",
      });
    }
  }

  await sendPushNotifications(messages);
}

export async function notifyOpportunityApproved(
  authorId: string,
  opportunityTitle: string
): Promise<void> {
  const tokens = await getUserPushTokens(authorId);
  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title: "Opportunity approved",
    body: `Your opportunity "${opportunityTitle}" has been approved and is now live.`,
    data: { type: "opportunity_approved" },
    sound: "default",
    channelId: "moderation",
  }));

  await sendPushNotifications(messages);
}

export async function notifyOpportunityRejected(
  authorId: string,
  opportunityTitle: string,
  reason: string
): Promise<void> {
  const tokens = await getUserPushTokens(authorId);
  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title: "Opportunity not approved",
    body: `Your opportunity "${opportunityTitle}" was not approved: ${reason}`,
    data: { type: "opportunity_rejected" },
    sound: "default",
    channelId: "moderation",
  }));

  await sendPushNotifications(messages);
}

export async function notifyMatchingUsersOfNewOpportunity(
  opportunityId: string,
  authorId: string,
  opportunityTitle: string,
  isDemo: boolean
): Promise<void> {
  try {
    const { findUsersMatchingOpportunity } = await import("./matching");
    const matchingUsers = await findUsersMatchingOpportunity(opportunityId, 0.55, 20, isDemo);

    const messages: PushMessage[] = [];
    for (const match of matchingUsers) {
      const tokens = await getUserPushTokens(match.userId);
      const relevance = Math.round(match.similarity * 100);
      for (const token of tokens) {
        messages.push({
          to: token,
          title: "New opportunity for you",
          body: `"${opportunityTitle}" — ${relevance}% match with your profile`,
          data: { type: "opportunity_match", opportunityId },
          sound: "default",
          channelId: "opportunities",
        });
      }
    }

    await sendPushNotifications(messages);
  } catch (err) {
    console.error("Opportunity match notification error:", err);
  }
}

export async function notifyMissedCall(
  userId: string,
  callerName: string,
  callType: string
): Promise<void> {
  const tokens = await getUserPushTokens(userId);
  const messages: PushMessage[] = tokens.map((token) => ({
    to: token,
    title: "Missed call",
    body: `You missed a ${callType.toLowerCase()} call from ${callerName}`,
    data: { type: "missed_call" },
    sound: "default",
    channelId: "calls",
  }));

  await sendPushNotifications(messages);
}
