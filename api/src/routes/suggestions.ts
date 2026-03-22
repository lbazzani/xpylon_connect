import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { findSimilarUsers, anonymizeProfile } from "../lib/matching";
import prisma from "../lib/prisma";

const router = Router();
router.use(authMiddleware);

// GET /suggestions — anonymous profiles ranked by similarity
router.get("/", async (req, res) => {
  try {
    const profiles = await findSimilarUsers(req.userId!, 10, req.isDemo || false);
    const anonymous = profiles.map(anonymizeProfile);
    res.json({ suggestions: anonymous });
  } catch (err) {
    console.error("Suggestions error:", err);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

// POST /suggestions/:id/connect — send connection request to suggested user
router.post("/:id/connect", async (req, res) => {
  try {
    const targetId = req.params.id as string;

    // Verify target exists and is in same mode
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target || target.isDemo !== (req.isDemo || false)) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check no existing connection
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: req.userId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: req.userId! },
        ],
      },
    });
    if (existing) {
      res.status(409).json({ error: "Connection already exists" });
      return;
    }

    const connection = await prisma.connection.create({
      data: { requesterId: req.userId!, addresseeId: targetId },
    });

    res.status(201).json({ connection });
  } catch (err) {
    res.status(500).json({ error: "Failed to send connection request" });
  }
});

export { router as suggestionsRouter };
