import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

// GET /users/me
router.get("/me", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { company: true },
    });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PATCH /users/me
router.patch("/me", async (req, res) => {
  try {
    const { firstName, lastName, bio, role } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(bio !== undefined && { bio }),
        ...(role !== undefined && { role }),
      },
      include: { company: true },
    });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// POST /users/me/fcm-token
router.post("/me/fcm-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) { res.status(400).json({ error: "token is required" }); return; }
    await prisma.fcmToken.upsert({
      where: { token },
      create: { userId: req.userId!, token },
      update: { userId: req.userId! },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save FCM token" });
  }
});

// DELETE /users/me/fcm-token
router.delete("/me/fcm-token", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) { res.status(400).json({ error: "token is required" }); return; }
    await prisma.fcmToken.deleteMany({ where: { token, userId: req.userId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete FCM token" });
  }
});

export { router as usersRouter };
