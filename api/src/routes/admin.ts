import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  notifyOpportunityApproved,
  notifyOpportunityRejected,
} from "../lib/notifications";

const router = Router();
router.use(authMiddleware);

// Admin guard middleware
async function adminGuard(req: Request, res: Response, next: Function) {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user?.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

router.use(adminGuard);

// GET /admin/opportunities/pending — Opportunities awaiting review
router.get("/opportunities/pending", async (req, res) => {
  try {
    const opportunities = await prisma.opportunity.findMany({
      where: { status: "UNDER_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: {
        author: { include: { company: true } },
      },
    });
    res.json({ opportunities });
  } catch (err) {
    console.error("Admin fetch pending error:", err);
    res.status(500).json({ error: "Failed to fetch pending opportunities" });
  }
});

// GET /admin/opportunities/history — Reviewed opportunities
router.get("/opportunities/history", async (req, res) => {
  try {
    const opportunities = await prisma.opportunity.findMany({
      where: {
        reviewedById: { not: null },
      },
      orderBy: { reviewedAt: "desc" },
      take: 50,
      include: {
        author: { include: { company: true } },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
    });
    res.json({ opportunities });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch review history" });
  }
});

// PATCH /admin/opportunities/:id/approve — Approve opportunity
router.patch("/opportunities/:id/approve", async (req, res) => {
  try {
    const id = req.params.id as string;
    const opp = await prisma.opportunity.findUnique({
      where: { id },
      include: { author: true },
    });
    if (!opp) { res.status(404).json({ error: "Not found" }); return; }
    if (opp.status !== "UNDER_REVIEW") {
      res.status(400).json({ error: "Opportunity is not under review" });
      return;
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        status: "ACTIVE",
        reviewNote: req.body.note || "Approved by admin",
        reviewedById: req.userId,
        reviewedAt: new Date(),
      },
      include: { author: { include: { company: true } } },
    });

    // If GROUP mode, create the group conversation now
    if (updated.commMode === "GROUP") {
      const existingConv = await prisma.conversation.findFirst({
        where: { opportunityId: id },
      });
      if (!existingConv) {
        await prisma.conversation.create({
          data: {
            type: "OPPORTUNITY_GROUP",
            name: updated.title,
            opportunityName: updated.title,
            opportunityId: id,
            createdById: updated.authorId,
            members: { create: [{ userId: updated.authorId }] },
          },
        });
      }
    }

    await notifyOpportunityApproved(opp.authorId, opp.title);

    res.json({ opportunity: updated });
  } catch (err) {
    console.error("Admin approve error:", err);
    res.status(500).json({ error: "Failed to approve opportunity" });
  }
});

// PATCH /admin/opportunities/:id/reject — Reject opportunity
router.patch("/opportunities/:id/reject", async (req, res) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ error: "Rejection reason is required" });
      return;
    }

    const opp = await prisma.opportunity.findUnique({
      where: { id },
      include: { author: true },
    });
    if (!opp) { res.status(404).json({ error: "Not found" }); return; }
    if (opp.status !== "UNDER_REVIEW") {
      res.status(400).json({ error: "Opportunity is not under review" });
      return;
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewNote: reason,
        reviewedById: req.userId,
        reviewedAt: new Date(),
      },
      include: { author: { include: { company: true } } },
    });

    await notifyOpportunityRejected(opp.authorId, opp.title, reason);

    res.json({ opportunity: updated });
  } catch (err) {
    console.error("Admin reject error:", err);
    res.status(500).json({ error: "Failed to reject opportunity" });
  }
});

// POST /admin/opportunities/:id/chat — Open a conversation with the author
router.post("/opportunities/:id/chat", async (req, res) => {
  try {
    const id = req.params.id as string;
    const opp = await prisma.opportunity.findUnique({ where: { id } });
    if (!opp) { res.status(404).json({ error: "Not found" }); return; }

    // Check if a direct conversation already exists between admin and author
    const existing = await prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { members: { some: { userId: req.userId } } },
          { members: { some: { userId: opp.authorId } } },
        ],
        topic: "GENERAL",
      },
    });

    if (existing) {
      res.json({ conversationId: existing.id });
      return;
    }

    const conversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        topic: "GENERAL",
        createdById: req.userId!,
        members: {
          create: [{ userId: req.userId! }, { userId: opp.authorId }],
        },
      },
    });

    // Send a system message about the review context
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: req.userId!,
        content: `Hi, I'm reaching out regarding your opportunity "${opp.title}" which is currently under compliance review. I'd like to discuss some details before we can approve it.`,
        type: "TEXT",
      },
    });

    res.json({ conversationId: conversation.id });
  } catch (err) {
    console.error("Admin chat error:", err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// GET /admin/stats — Dashboard stats
router.get("/stats", async (req, res) => {
  try {
    const [pendingCount, approvedToday, rejectedToday] = await Promise.all([
      prisma.opportunity.count({ where: { status: "UNDER_REVIEW" } }),
      prisma.opportunity.count({
        where: {
          reviewedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: "ACTIVE",
          reviewedById: { not: null },
        },
      }),
      prisma.opportunity.count({
        where: {
          reviewedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: "REJECTED",
        },
      }),
    ]);

    res.json({ pendingCount, approvedToday, rejectedToday });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export { router as adminRouter };
