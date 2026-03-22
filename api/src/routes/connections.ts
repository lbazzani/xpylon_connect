import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// GET /connections — accepted contacts
router.get("/", async (req, res) => {
  try {
    const connections = await prisma.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: req.userId }, { addresseeId: req.userId }],
        requester: { isDemo: req.isDemo || false },
        addressee: { isDemo: req.isDemo || false },
      },
      include: {
        requester: { include: { company: true } },
        addressee: { include: { company: true } },
      },
    });
    res.json({ connections });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch connections" });
  }
});

// GET /connections/pending — incoming requests
router.get("/pending", async (req, res) => {
  try {
    const connections = await prisma.connection.findMany({
      where: {
        addresseeId: req.userId,
        status: "PENDING",
        requester: { isDemo: req.isDemo || false },
      },
      include: { requester: { include: { company: true } } },
    });
    res.json({ connections });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending connections" });
  }
});

// POST /connections/request
router.post("/request", async (req, res) => {
  try {
    const { addresseeId } = req.body;
    if (!addresseeId) { res.status(400).json({ error: "addresseeId is required" }); return; }
    if (addresseeId === req.userId) { res.status(400).json({ error: "Cannot connect with yourself" }); return; }

    // Ensure both users are in the same mode (demo/real)
    const addressee = await prisma.user.findUnique({ where: { id: addresseeId } });
    if (!addressee || addressee.isDemo !== (req.isDemo || false)) {
      res.status(400).json({ error: "Cannot connect with this user" });
      return;
    }

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, addresseeId },
          { requesterId: addresseeId, addresseeId: req.userId },
        ],
      },
    });
    if (existing) { res.status(409).json({ error: "Connection already exists" }); return; }

    const connection = await prisma.connection.create({
      data: { requesterId: req.userId!, addresseeId },
      include: { requester: { include: { company: true } }, addressee: { include: { company: true } } },
    });
    res.status(201).json({ connection });
  } catch (err) {
    res.status(500).json({ error: "Failed to create connection request" });
  }
});

// POST /connections/:id/accept
router.post("/:id/accept", async (req, res) => {
  try {
    const connection = await prisma.connection.findUnique({ where: { id: req.params.id } });
    if (!connection) { res.status(404).json({ error: "Connection not found" }); return; }
    if (connection.addresseeId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }

    const updated = await prisma.connection.update({
      where: { id: req.params.id },
      data: { status: "ACCEPTED" },
      include: { requester: { include: { company: true } }, addressee: { include: { company: true } } },
    });
    res.json({ connection: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to accept connection" });
  }
});

// POST /connections/:id/decline
router.post("/:id/decline", async (req, res) => {
  try {
    const connection = await prisma.connection.findUnique({ where: { id: req.params.id } });
    if (!connection) { res.status(404).json({ error: "Connection not found" }); return; }
    if (connection.addresseeId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }

    const updated = await prisma.connection.update({
      where: { id: req.params.id },
      data: { status: "DECLINED" },
    });
    res.json({ connection: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to decline connection" });
  }
});

// GET /connections/:userId/shared — shared context with a contact
router.get("/:userId/shared", async (req, res) => {
  try {
    const contactId = req.params.userId as string;

    // Verify connection exists
    const connection = await prisma.connection.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: req.userId, addresseeId: contactId },
          { requesterId: contactId, addresseeId: req.userId },
        ],
      },
    });
    if (!connection) { res.status(403).json({ error: "Not connected" }); return; }

    // Find opportunities where both users are involved (author or interested)
    const [myOpportunities, theirOpportunities, mutualInterests] = await Promise.all([
      // My opportunities where this contact showed interest
      prisma.opportunity.findMany({
        where: {
          authorId: req.userId,
          interests: { some: { userId: contactId } },
        },
        include: {
          interests: { where: { userId: contactId }, select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // Their opportunities where I showed interest
      prisma.opportunity.findMany({
        where: {
          authorId: contactId,
          interests: { some: { userId: req.userId } },
        },
        include: {
          interests: { where: { userId: req.userId }, select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // Opportunities where both are interested (not authored by either)
      prisma.opportunity.findMany({
        where: {
          authorId: { notIn: [req.userId!, contactId] },
          AND: [
            { interests: { some: { userId: req.userId } } },
            { interests: { some: { userId: contactId } } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Get shared conversations
    const conversations = await prisma.conversation.findMany({
      where: {
        AND: [
          { members: { some: { userId: req.userId } } },
          { members: { some: { userId: contactId } } },
        ],
      },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      myOpportunities: myOpportunities.map((o) => ({
        ...o,
        interestStatus: o.interests[0]?.status || null,
        interests: undefined,
      })),
      theirOpportunities: theirOpportunities.map((o) => ({
        ...o,
        interestStatus: o.interests[0]?.status || null,
        interests: undefined,
      })),
      mutualInterests,
      conversations: conversations.map((c) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        opportunityName: c.opportunityName,
        lastMessage: c.messages[0] || null,
      })),
    });
  } catch (err) {
    console.error("Shared context error:", err);
    res.status(500).json({ error: "Failed to fetch shared context" });
  }
});

export { router as connectionsRouter };
