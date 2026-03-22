import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// GET /conversations/grouped — conversations grouped by contact
router.get("/grouped", async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        members: { some: { userId: req.userId } },
      },
      include: {
        members: { include: { user: { include: { company: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by the other member (contact)
    const grouped = new Map<string, {
      contact: any;
      conversations: any[];
      lastActivityAt: string;
    }>();

    for (const conv of conversations) {
      const otherMember = conv.members.find((m) => m.userId !== req.userId);
      if (!otherMember) continue;
      const contactId = otherMember.userId;
      const lastMsg = conv.messages[0];
      const lastActivity = lastMsg?.createdAt.toISOString() || conv.createdAt.toISOString();

      const convData = {
        id: conv.id,
        type: conv.type,
        topic: conv.topic,
        name: conv.name,
        opportunityName: conv.opportunityName,
        opportunityId: conv.opportunityId,
        lastMessage: lastMsg ? {
          id: lastMsg.id,
          content: lastMsg.content,
          senderId: lastMsg.senderId,
          createdAt: lastMsg.createdAt.toISOString(),
          sender: lastMsg.sender,
        } : null,
        createdAt: conv.createdAt.toISOString(),
      };

      if (grouped.has(contactId)) {
        const existing = grouped.get(contactId)!;
        existing.conversations.push(convData);
        if (lastActivity > existing.lastActivityAt) {
          existing.lastActivityAt = lastActivity;
        }
      } else {
        grouped.set(contactId, {
          contact: otherMember.user,
          conversations: [convData],
          lastActivityAt: lastActivity,
        });
      }
    }

    // For group conversations, use the group name as contact
    // Sort groups by last activity
    const result = Array.from(grouped.entries())
      .map(([contactId, data]) => ({
        contactId,
        contact: data.contact,
        conversations: data.conversations.sort((a: any, b: any) =>
          new Date(b.lastMessage?.createdAt || b.createdAt).getTime() -
          new Date(a.lastMessage?.createdAt || a.createdAt).getTime()
        ),
        threadCount: data.conversations.length,
        lastActivityAt: data.lastActivityAt,
      }))
      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

    res.json({ threads: result });
  } catch (err) {
    console.error("Grouped conversations error:", err);
    res.status(500).json({ error: "Failed to fetch grouped conversations" });
  }
});

// GET /conversations/bot — get or create the general bot conversation
router.get("/bot", async (req, res) => {
  try {
    const { createWelcomeConversation } = await import("../lib/bot");
    const conversationId = await createWelcomeConversation(req.userId!);
    res.json({ conversationId });
  } catch (err) {
    res.status(500).json({ error: "Failed to get bot conversation" });
  }
});

// POST /conversations/bot-opportunity — create opportunity conversation with bot
router.post("/bot-opportunity", async (req, res) => {
  try {
    const { createOpportunityConversation } = await import("../lib/bot");
    const conversationId = await createOpportunityConversation(req.userId!);
    res.status(201).json({ conversationId });
  } catch (err) {
    res.status(500).json({ error: "Failed to create opportunity conversation" });
  }
});

// GET /conversations — list conversations with last message
router.get("/", async (req, res) => {
  try {
    const { cursor, limit = "30" } = req.query;
    const take = Math.min(parseInt(limit as string, 10) || 30, 100);

    const conversations = await prisma.conversation.findMany({
      where: {
        members: { some: { userId: req.userId } },
      },
      include: {
        members: { include: { user: { include: { company: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    const result = conversations.map((c) => ({
      ...c,
      lastMessage: c.messages[0] || null,
      messages: undefined,
    }));

    res.json({ conversations: result });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// POST /conversations/direct — create or return existing direct conversation
router.post("/direct", async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) { res.status(400).json({ error: "contactId is required" }); return; }

    const connection = await prisma.connection.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: req.userId, addresseeId: contactId },
          { requesterId: contactId, addresseeId: req.userId! },
        ],
      },
    });
    if (!connection) { res.status(403).json({ error: "Not connected with this user" }); return; }

    // Check if direct conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { members: { some: { userId: req.userId } } },
          { members: { some: { userId: contactId } } },
        ],
      },
      include: { members: { include: { user: { include: { company: true } } } } },
    });

    if (existing) { res.json({ conversation: existing }); return; }

    const conversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        createdById: req.userId!,
        members: {
          create: [{ userId: req.userId! }, { userId: contactId }],
        },
      },
      include: { members: { include: { user: { include: { company: true } } } } },
    });
    res.status(201).json({ conversation });
  } catch (err) {
    res.status(500).json({ error: "Failed to create direct conversation" });
  }
});

// POST /conversations/group — create group conversation
router.post("/group", async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    if (!name || !memberIds?.length) {
      res.status(400).json({ error: "name and memberIds are required" });
      return;
    }

    const uniqueIds = [...new Set(memberIds as string[])];
    const connections = await prisma.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: uniqueIds.map((id: string) => ({
          OR: [
            { requesterId: req.userId, addresseeId: id },
            { requesterId: id, addresseeId: req.userId! },
          ],
        })).flat(),
      },
    });
    const connectedIds = new Set(connections.map((c) =>
      c.requesterId === req.userId ? c.addresseeId : c.requesterId
    ));
    const invalidIds = uniqueIds.filter((id) => !connectedIds.has(id));
    if (invalidIds.length > 0) {
      res.status(400).json({ error: "Some members are not in your contacts" });
      return;
    }

    const allMembers = [req.userId!, ...uniqueIds.filter((id: string) => id !== req.userId)];

    const conversation = await prisma.conversation.create({
      data: {
        type: "OPPORTUNITY_GROUP",
        name,
        opportunityName: name,
        createdById: req.userId!,
        members: {
          create: allMembers.map((userId: string) => ({ userId })),
        },
      },
      include: { members: { include: { user: { include: { company: true } } } } },
    });
    res.status(201).json({ conversation });
  } catch (err) {
    res.status(500).json({ error: "Failed to create group conversation" });
  }
});

// PATCH /conversations/:id — rename group
router.patch("/:id", async (req, res) => {
  try {
    const { name } = req.body;
    const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return; }

    const isMember = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id as string, userId: req.userId! } }
    });
    if (!isMember) { res.status(403).json({ error: "Not a member" }); return; }

    if (conversation.createdById !== req.userId) { res.status(403).json({ error: "Only creator can rename" }); return; }

    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { name },
      include: { members: { include: { user: { include: { company: true } } } } },
    });
    res.json({ conversation: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to rename conversation" });
  }
});

// GET /conversations/:id/messages — paginated messages
router.get("/:id/messages", async (req, res) => {
  try {
    const isMember = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id as string, userId: req.userId! } }
    });
    if (!isMember) { res.status(403).json({ error: "Not a member" }); return; }

    const { cursor, limit = "50" } = req.query;
    const take = Math.min(parseInt(limit as string, 10), 100);

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      include: { sender: { include: { company: true } } },
    });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /conversations/:id/members — add member (creator only, groups only)
router.post("/:id/members", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) { res.status(400).json({ error: "userId is required" }); return; }

    const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return; }

    const isMember = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: req.params.id as string, userId: req.userId! } }
    });
    if (!isMember) { res.status(403).json({ error: "Not a member" }); return; }

    if (conversation.type !== "OPPORTUNITY_GROUP") { res.status(400).json({ error: "Can only add members to groups" }); return; }
    if (conversation.createdById !== req.userId) { res.status(403).json({ error: "Only creator can add members" }); return; }

    const member = await prisma.conversationMember.create({
      data: { conversationId: req.params.id, userId },
      include: { user: { include: { company: true } } },
    });
    res.status(201).json({ member });
  } catch (err) {
    res.status(500).json({ error: "Failed to add member" });
  }
});

// POST /conversations/:id/summarize — On-demand chat summary
router.post("/:id/summarize", async (req, res) => {
  try {
    const convId = req.params.id as string;
    if (!(await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: convId, userId: req.userId! } },
    }))) {
      res.status(403).json({ error: "Not a member" });
      return;
    }

    const { summarizeConversationMessages, postSummaryToConversation } = await import("../lib/transcription");
    const summary = await summarizeConversationMessages(convId);

    if (summary.topicsDiscussed.length === 0 && summary.keyDecisions.length === 0 && summary.nextSteps.length === 0) {
      res.json({ summary: null, message: "No professional content to summarize" });
      return;
    }

    const msgCount = await prisma.message.count({
      where: { conversationId: convId, deletedAt: null, type: "TEXT" },
    });

    await postSummaryToConversation(convId, summary, "chat", `${msgCount} messages`);
    res.json({ summary, success: true });
  } catch (err) {
    console.error("Chat summarize error:", err);
    res.status(500).json({ error: "Failed to summarize conversation" });
  }
});

export { router as conversationsRouter };
