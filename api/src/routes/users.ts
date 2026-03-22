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
    const { firstName, lastName, bio, role, industry, companyId } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(bio !== undefined && { bio }),
        ...(role !== undefined && { role }),
        ...(industry !== undefined && { industry }),
        ...(companyId !== undefined && { companyId }),
      },
      include: { company: true },
    });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// GET /users/companies/search — fuzzy company search for autocomplete
router.get("/companies/search", async (req, res) => {
  try {
    const q = (req.query.q as string || "").trim();
    if (q.length < 2) {
      res.json({ companies: [] });
      return;
    }

    const companies = await prisma.company.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
      take: 10,
    });

    res.json({
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        memberCount: c._count.users,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to search companies" });
  }
});

// POST /users/companies — create new company (returns existing if name matches)
router.post("/companies", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: "Company name is required" });
      return;
    }

    const trimmed = name.trim();

    // Check for existing company (case-insensitive)
    const existing = await prisma.company.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    });

    if (existing) {
      res.json({ company: existing, isExisting: true });
      return;
    }

    const company = await prisma.company.create({
      data: { name: trimmed },
    });
    res.status(201).json({ company, isExisting: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to create company" });
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
