import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// GET /conversations — list conversations with last message
router.get("/", async (req, res) => {
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

    const allMembers = [req.userId!, ...memberIds.filter((id: string) => id !== req.userId)];

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

export { router as conversationsRouter };
