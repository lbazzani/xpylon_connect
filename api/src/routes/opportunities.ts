import { Router } from "express";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { moderateOpportunity } from "../lib/moderation";
import { notifyComplianceReview } from "../lib/notifications";

const router = Router();
router.use(authMiddleware);

// GET /opportunities — Discover feed (NETWORK + OPEN, paginated)
// Excludes author's own, excludes INVITE_ONLY
// For NETWORK: could add tag/type matching in future
router.get("/", async (req, res) => {
  try {
    const { cursor, limit = "20", type, status = "ACTIVE" } = req.query;
    const take = Math.min(parseInt(limit as string, 10) || 20, 50);

    const where: any = {
      status: status as string,
      authorId: { not: req.userId },
      visibility: { in: ["NETWORK", "OPEN"] },
      NOT: { status: { in: ["UNDER_REVIEW", "REJECTED"] } },
    };
    if (type && type !== "all") where.type = type as string;

    const opportunities = await prisma.opportunity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      include: {
        author: { include: { company: true } },
        _count: { select: { interests: true, savedBy: true } },
        interests: { where: { userId: req.userId }, select: { status: true } },
        savedBy: { where: { userId: req.userId }, select: { userId: true } },
      },
    });

    const result = opportunities.map((o) => ({
      ...o,
      interestStatus: o.interests[0]?.status || null,
      isSaved: o.savedBy.length > 0,
      interestedCount: o._count.interests,
      interests: undefined,
      savedBy: undefined,
      _count: undefined,
    }));

    res.json({ opportunities: result });
  } catch (err) {
    console.error("Opportunities fetch error:", err);
    res.status(500).json({ error: "Failed to fetch opportunities" });
  }
});

// GET /opportunities/mine — Author's own opportunities
router.get("/mine", async (req, res) => {
  try {
    const opportunities = await prisma.opportunity.findMany({
      where: { authorId: req.userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { interests: true, conversations: true } },
        interests: { where: { status: "ACCEPTED" }, select: { id: true } },
      },
    });

    const result = opportunities.map((o) => ({
      ...o,
      interestedCount: o._count.interests,
      acceptedCount: o.interests.length,
      chatCount: o._count.conversations,
      interests: undefined,
      _count: undefined,
    }));

    res.json({ opportunities: result });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch opportunities" });
  }
});

// GET /opportunities/saved — User's saved opportunities
router.get("/saved", async (req, res) => {
  try {
    const saved = await prisma.opportunitySaved.findMany({
      where: { userId: req.userId },
      orderBy: { savedAt: "desc" },
      include: {
        opportunity: {
          include: {
            author: { include: { company: true } },
            _count: { select: { interests: true } },
          },
        },
      },
    });

    res.json({ opportunities: saved.map((s) => ({ ...s.opportunity, isSaved: true, interestedCount: s.opportunity._count.interests, _count: undefined })) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch saved opportunities" });
  }
});

// GET /opportunities/:id — Detail
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id as string;
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        author: { include: { company: true } },
        _count: { select: { interests: { where: { status: "ACCEPTED" } } } },
        interests: { where: { userId: req.userId }, select: { status: true } },
        savedBy: { where: { userId: req.userId }, select: { userId: true } },
      },
    });

    if (!opportunity) { res.status(404).json({ error: "Not found" }); return; }

    // Count total interested
    const totalInterested = await prisma.opportunityInterest.count({ where: { opportunityId: id } });

    res.json({
      opportunity: {
        ...opportunity,
        interestStatus: opportunity.interests[0]?.status || null,
        isSaved: opportunity.savedBy.length > 0,
        interestedCount: totalInterested,
        acceptedCount: opportunity._count.interests,
        interests: undefined,
        savedBy: undefined,
        _count: undefined,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch opportunity" });
  }
});

// POST /opportunities — Create
router.post("/", async (req, res) => {
  try {
    const { title, description, type, tags, visibility, commMode, expiresAt } = req.body;
    if (!title || !type || !visibility || !commMode) {
      res.status(400).json({ error: "title, type, visibility, and commMode are required" });
      return;
    }

    // Run AI compliance review
    const modResult = await moderateOpportunity(title, description || "", type, tags || []);

    // Rejected outright — don't even create
    if (modResult.decision === "REJECTED") {
      res.status(422).json({
        error: "This opportunity does not comply with our guidelines.",
        reason: modResult.reason,
      });
      return;
    }

    const needsReview = modResult.decision === "UNDER_REVIEW";

    const opportunity = await prisma.opportunity.create({
      data: {
        authorId: req.userId!,
        title,
        description: description || "",
        type,
        tags: tags || [],
        visibility,
        commMode,
        status: needsReview ? "UNDER_REVIEW" : "ACTIVE",
        reviewNote: needsReview ? modResult.reason : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: { author: { include: { company: true } } },
    });

    // Only create GROUP conversation if approved immediately
    if (!needsReview && commMode === "GROUP") {
      await prisma.conversation.create({
        data: {
          type: "OPPORTUNITY_GROUP",
          name: title,
          opportunityName: title,
          opportunityId: opportunity.id,
          createdById: req.userId!,
          members: { create: [{ userId: req.userId! }] },
        },
      });
    }

    // Notify admins if flagged for review
    if (needsReview) {
      const authorName = `${opportunity.author.firstName} ${opportunity.author.lastName}`;
      notifyComplianceReview(opportunity.id, title, authorName, modResult.reason).catch(console.error);
    }

    res.status(201).json({ opportunity });
  } catch (err) {
    res.status(500).json({ error: "Failed to create opportunity" });
  }
});

// PATCH /opportunities/:id — Update (author only)
router.patch("/:id", async (req, res) => {
  try {
    const opp = await prisma.opportunity.findUnique({ where: { id: req.params.id as string } });
    if (!opp) { res.status(404).json({ error: "Not found" }); return; }
    if (opp.authorId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }

    const { title, description, tags, visibility, commMode, expiresAt } = req.body;
    const updated = await prisma.opportunity.update({
      where: { id: req.params.id as string },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(tags && { tags }),
        ...(visibility && { visibility }),
        ...(commMode && { commMode }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
      include: { author: { include: { company: true } } },
    });
    res.json({ opportunity: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update opportunity" });
  }
});

// PATCH /opportunities/:id/status — Change status (author only)
router.patch("/:id/status", async (req, res) => {
  try {
    const opp = await prisma.opportunity.findUnique({ where: { id: req.params.id as string } });
    if (!opp) { res.status(404).json({ error: "Not found" }); return; }
    if (opp.authorId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }

    const { status } = req.body;
    if (!["ACTIVE", "PAUSED", "CLOSED"].includes(status) || opp.status === "UNDER_REVIEW" || opp.status === "REJECTED") {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const updated = await prisma.opportunity.update({
      where: { id: req.params.id as string },
      data: { status },
    });
    res.json({ opportunity: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// DELETE /opportunities/:id — Delete (author only)
router.delete("/:id", async (req, res) => {
  try {
    const opp = await prisma.opportunity.findUnique({ where: { id: req.params.id as string } });
    if (!opp) { res.status(404).json({ error: "Not found" }); return; }
    if (opp.authorId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }

    // Clean up related data
    await prisma.opportunityInterest.deleteMany({ where: { opportunityId: opp.id } });
    await prisma.opportunitySaved.deleteMany({ where: { opportunityId: opp.id } });
    await prisma.opportunity.delete({ where: { id: opp.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete opportunity" });
  }
});

// POST /opportunities/:id/interest — Express interest
router.post("/:id/interest", async (req, res) => {
  try {
    const oppId = req.params.id as string;
    const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
    if (!opp) { res.status(404).json({ error: "Not found" }); return; }
    if (opp.status !== "ACTIVE") { res.status(400).json({ error: "Opportunity is not active" }); return; }
    if (opp.authorId === req.userId) { res.status(400).json({ error: "Cannot express interest in own opportunity" }); return; }

    // For OPEN opportunities, auto-accept and create conversation
    if (opp.visibility === "OPEN") {
      const interest = await prisma.opportunityInterest.create({
        data: { opportunityId: oppId, userId: req.userId!, status: "ACCEPTED" },
      });

      // Create or add to conversation
      let conversation;
      if (opp.commMode === "GROUP") {
        conversation = await prisma.conversation.findFirst({ where: { opportunityId: oppId } });
        if (conversation) {
          await prisma.conversationMember.create({
            data: { conversationId: conversation.id, userId: req.userId! },
          }).catch(() => {}); // ignore if already member
        }
      } else {
        conversation = await prisma.conversation.create({
          data: {
            type: "DIRECT",
            opportunityId: oppId,
            createdById: req.userId!,
            members: { create: [{ userId: req.userId! }, { userId: opp.authorId }] },
          },
        });
      }

      res.status(201).json({ interest, conversationId: conversation?.id });
      return;
    }

    // For NETWORK/INVITE_ONLY — create pending interest
    const interest = await prisma.opportunityInterest.create({
      data: { opportunityId: oppId, userId: req.userId! },
    });
    res.status(201).json({ interest });
  } catch (err) {
    res.status(500).json({ error: "Failed to express interest" });
  }
});

// DELETE /opportunities/:id/interest — Withdraw interest
router.delete("/:id/interest", async (req, res) => {
  try {
    await prisma.opportunityInterest.deleteMany({
      where: { opportunityId: req.params.id as string, userId: req.userId },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to withdraw interest" });
  }
});

// GET /opportunities/:id/interests — List interested users (author only)
router.get("/:id/interests", async (req, res) => {
  try {
    const opp = await prisma.opportunity.findUnique({ where: { id: req.params.id as string } });
    if (!opp) { res.status(404).json({ error: "Not found" }); return; }
    if (opp.authorId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }

    const interests = await prisma.opportunityInterest.findMany({
      where: { opportunityId: req.params.id as string },
      orderBy: { createdAt: "desc" },
      include: { user: { include: { company: true } } },
    });
    res.json({ interests });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch interests" });
  }
});

// PATCH /opportunities/:id/interests/:userId — Accept/decline interest (author only)
router.patch("/:id/interests/:userId", async (req, res) => {
  try {
    const oppId = req.params.id as string;
    const targetUserId = req.params.userId as string;
    const { status } = req.body;

    if (!["ACCEPTED", "DECLINED"].includes(status)) {
      res.status(400).json({ error: "Status must be ACCEPTED or DECLINED" });
      return;
    }

    const opp = await prisma.opportunity.findUnique({ where: { id: oppId } });
    if (!opp) { res.status(404).json({ error: "Not found" }); return; }
    if (opp.authorId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }

    const interest = await prisma.opportunityInterest.findUnique({
      where: { opportunityId_userId: { opportunityId: oppId, userId: targetUserId } },
    });
    if (!interest) { res.status(404).json({ error: "Interest not found" }); return; }

    await prisma.opportunityInterest.update({
      where: { id: interest.id },
      data: { status },
    });

    // If accepted, create/add to conversation
    let conversationId: string | null = null;
    if (status === "ACCEPTED") {
      if (opp.commMode === "GROUP") {
        const conv = await prisma.conversation.findFirst({ where: { opportunityId: oppId } });
        if (conv) {
          await prisma.conversationMember.create({
            data: { conversationId: conv.id, userId: targetUserId },
          }).catch(() => {});
          conversationId = conv.id;
        }
      } else {
        const conv = await prisma.conversation.create({
          data: {
            type: "DIRECT",
            opportunityId: oppId,
            createdById: opp.authorId,
            members: { create: [{ userId: opp.authorId }, { userId: targetUserId }] },
          },
        });
        conversationId = conv.id;
      }
    }

    res.json({ success: true, conversationId });
  } catch (err) {
    res.status(500).json({ error: "Failed to update interest" });
  }
});

// POST /opportunities/:id/save — Save
router.post("/:id/save", async (req, res) => {
  try {
    await prisma.opportunitySaved.create({
      data: { opportunityId: req.params.id as string, userId: req.userId! },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save opportunity" });
  }
});

// DELETE /opportunities/:id/save — Unsave
router.delete("/:id/save", async (req, res) => {
  try {
    await prisma.opportunitySaved.deleteMany({
      where: { opportunityId: req.params.id as string, userId: req.userId },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to unsave opportunity" });
  }
});

export { router as opportunitiesRouter };
