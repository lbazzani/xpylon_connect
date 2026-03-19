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
      where: { addresseeId: req.userId, status: "PENDING" },
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

export { router as connectionsRouter };
