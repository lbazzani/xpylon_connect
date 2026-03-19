import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// POST /invites — create invite (auth required)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { phoneTarget } = req.body;
    if (!phoneTarget) { res.status(400).json({ error: "phoneTarget is required" }); return; }

    const invite = await prisma.invite.create({
      data: {
        senderId: req.userId!,
        phoneTarget,
        token: uuidv4(),
      },
      include: { sender: { include: { company: true } } },
    });

    // TODO: Send SMS with deep link xpylonconnect://invite/{token}

    res.status(201).json({ invite });
  } catch (err) {
    res.status(500).json({ error: "Failed to create invite" });
  }
});

// GET /invites/:token — public, for deep link resolution
router.get("/:token", async (req, res) => {
  try {
    const invite = await prisma.invite.findUnique({
      where: { token: req.params.token },
      include: { sender: { include: { company: true } } },
    });
    if (!invite) { res.status(404).json({ error: "Invite not found" }); return; }
    res.json({ invite });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invite" });
  }
});

export { router as invitesRouter };
