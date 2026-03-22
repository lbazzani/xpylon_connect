import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

// POST /reminders — Create a reminder
router.post("/", async (req, res) => {
  try {
    const { conversationId, content, scheduledAt } = req.body;
    if (!conversationId || !content || !scheduledAt) {
      res.status(400).json({ error: "conversationId, content, and scheduledAt are required" });
      return;
    }

    const scheduled = new Date(scheduledAt);
    if (scheduled <= new Date()) {
      res.status(400).json({ error: "scheduledAt must be in the future" });
      return;
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId: req.userId!,
        conversationId,
        content,
        scheduledAt: scheduled,
      },
    });

    res.status(201).json({ reminder });
  } catch (err) {
    console.error("Create reminder error:", err);
    res.status(500).json({ error: "Failed to create reminder" });
  }
});

// GET /reminders — List user's active reminders
router.get("/", async (req, res) => {
  try {
    const reminders = await prisma.reminder.findMany({
      where: { userId: req.userId, status: "PENDING" },
      orderBy: { scheduledAt: "asc" },
      include: { conversation: { select: { id: true, name: true, type: true } } },
    });
    res.json({ reminders });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

// DELETE /reminders/:id — Cancel a reminder
router.delete("/:id", async (req, res) => {
  try {
    const reminder = await prisma.reminder.findUnique({ where: { id: req.params.id as string } });
    if (!reminder) { res.status(404).json({ error: "Not found" }); return; }
    if (reminder.userId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }

    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: "CANCELLED" },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel reminder" });
  }
});

export { router as remindersRouter };
