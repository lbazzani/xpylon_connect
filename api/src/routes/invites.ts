import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import twilio from "twilio";
import multer from "multer";
import prisma from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { notifyConnectionAccepted } from "../lib/notifications";
import { uploadFile } from "../lib/storage";
import fs from "fs";
import { enqueueCardImports } from "../lib/cardImportQueue";

const router = Router();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER!;

// POST /invites — create invite + send SMS (auth required)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { phoneTarget } = req.body;
    if (!phoneTarget) { res.status(400).json({ error: "phoneTarget is required" }); return; }

    // Can't invite yourself
    const sender = await prisma.user.findUnique({ where: { id: req.userId } });
    if (sender?.phone === phoneTarget) {
      res.status(400).json({ error: "You cannot invite yourself" });
      return;
    }

    // Check if already connected with this phone
    const targetUser = await prisma.user.findUnique({ where: { phone: phoneTarget } });
    if (targetUser) {
      const existingConn = await prisma.connection.findFirst({
        where: {
          OR: [
            { requesterId: req.userId, addresseeId: targetUser.id },
            { requesterId: targetUser.id, addresseeId: req.userId },
          ],
        },
      });
      if (existingConn) {
        res.status(409).json({ error: "You are already connected with this person" });
        return;
      }
    }

    // Check for existing pending invite to same number from same sender
    const existingInvite = await prisma.invite.findFirst({
      where: { senderId: req.userId, phoneTarget, status: "PENDING" },
    });
    if (existingInvite) {
      res.status(409).json({ error: "You already have a pending invite to this number" });
      return;
    }

    const token = uuidv4();
    const invite = await prisma.invite.create({
      data: {
        senderId: req.userId!,
        phoneTarget,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: { sender: { include: { company: true } } },
    });

    // If target user already exists, create connection directly
    if (targetUser) {
      await prisma.connection.create({
        data: { requesterId: req.userId!, addresseeId: targetUser.id, status: "PENDING" },
      }).catch(() => {}); // ignore if already exists
    }

    // Send SMS with deep link (skip for demo users)
    if (!req.isDemo) {
      const senderName = `${sender?.firstName || ""} ${sender?.lastName || ""}`.trim() || "Someone";
      const webUrl = process.env.WEB_URL || "http://localhost:3000";
      const inviteLink = `${webUrl}/invite/${token}`;
      try {
        await twilioClient.messages.create({
          to: phoneTarget,
          from: TWILIO_PHONE,
          body: `${senderName} invited you to connect on Xpylon Connect — the B2B networking platform. Join here: ${inviteLink}`,
        });
      } catch (smsErr) {
        console.error("SMS send error:", smsErr);
        // Don't fail the invite if SMS fails
      }
    }

    res.status(201).json({ invite });
  } catch (err) {
    console.error("Invite creation error:", err);
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

// POST /invites/:token/accept — accept invite (auth required)
router.post("/:token/accept", authMiddleware, async (req, res) => {
  try {
    const invite = await prisma.invite.findUnique({
      where: { token: req.params.token as string },
      include: { sender: true },
    });
    if (!invite) { res.status(404).json({ error: "Invite not found" }); return; }
    if (invite.status !== "PENDING") {
      res.status(400).json({ error: "Invite is no longer pending" });
      return;
    }

    // Verify the current user's phone matches the target
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.phone !== invite.phoneTarget) {
      res.status(403).json({ error: "This invite is not for you" });
      return;
    }

    // Update invite status
    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });

    // Create or update connection to ACCEPTED
    const existingConn = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: invite.senderId, addresseeId: req.userId },
          { requesterId: req.userId, addresseeId: invite.senderId },
        ],
      },
    });

    if (existingConn) {
      await prisma.connection.update({
        where: { id: existingConn.id },
        data: { status: "ACCEPTED" },
      });
    } else {
      await prisma.connection.create({
        data: { requesterId: invite.senderId, addresseeId: req.userId!, status: "ACCEPTED" },
      });
    }

    // Notify sender
    if (user) {
      notifyConnectionAccepted(invite.senderId, { firstName: user.firstName, lastName: user.lastName }).catch(console.error);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Accept invite error:", err);
    res.status(500).json({ error: "Failed to accept invite" });
  }
});

// ── Business card scan endpoints ──

const upload = multer({ dest: "/tmp/card-uploads", limits: { fileSize: 20 * 1024 * 1024 } });

// POST /invites/scan — Batch upload business card images
router.post("/scan", authMiddleware, upload.array("cards", 20), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "At least one image is required" });
      return;
    }

    const imports = [];
    for (const file of files) {
      // Process and store the image
      const buffer = fs.readFileSync(file.path);
      const storageObject = await uploadFile(buffer, file.originalname, file.mimetype, req.userId!, "business-cards");
      // Clean up temp file
      fs.unlinkSync(file.path);

      // Create CardImport record
      const cardImport = await prisma.cardImport.create({
        data: {
          userId: req.userId!,
          storageObjectId: storageObject.id,
          status: "QUEUED",
        },
      });

      imports.push({
        id: cardImport.id,
        status: cardImport.status,
        imageUrl: `/storage/attachments/${storageObject.key}?variant=medium`,
      });
    }

    // Enqueue all for sequential processing
    enqueueCardImports(imports.map((i) => i.id));

    res.status(201).json({ imports });
  } catch (err) {
    console.error("Card scan upload error:", err);
    res.status(500).json({ error: "Failed to upload business cards" });
  }
});

// GET /invites/imports — List user's card imports
router.get("/imports", authMiddleware, async (req, res) => {
  try {
    const imports = await prisma.cardImport.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        storageObject: { select: { bucket: true, key: true } },
        invite: { select: { id: true, status: true, phoneTarget: true } },
      },
    });

    const result = imports.map((i) => ({
      id: i.id,
      status: i.status,
      extractedData: i.extractedData,
      error: i.error,
      imageUrl: `/storage/${i.storageObject.bucket}/${i.storageObject.key}?variant=medium`,
      imageFullUrl: `/storage/${i.storageObject.bucket}/${i.storageObject.key}?variant=large`,
      invite: i.invite,
      createdAt: i.createdAt,
      processedAt: i.processedAt,
    }));

    res.json({ imports: result });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch imports" });
  }
});

// POST /invites/imports/:id/confirm — Confirm extracted data and send invite
router.post("/imports/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const importId = req.params.id as string;
    const { phone, firstName, lastName, role, company, email } = req.body;

    if (!phone) {
      res.status(400).json({ error: "Phone number is required" });
      return;
    }

    const cardImport = await prisma.cardImport.findUnique({ where: { id: importId } });
    if (!cardImport) { res.status(404).json({ error: "Import not found" }); return; }
    if (cardImport.userId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }
    if (cardImport.status !== "EXTRACTED") {
      res.status(400).json({ error: "Import is not ready for confirmation" });
      return;
    }

    // Create or find company
    let companyId: string | undefined;
    if (company?.trim()) {
      const existing = await prisma.company.findFirst({
        where: { name: { equals: company.trim(), mode: "insensitive" } },
      });
      if (existing) {
        companyId = existing.id;
      } else {
        const newCompany = await prisma.company.create({ data: { name: company.trim() } });
        companyId = newCompany.id;
      }
    }

    // Create invite
    const sender = await prisma.user.findUnique({ where: { id: req.userId } });
    const token = uuidv4();
    const invite = await prisma.invite.create({
      data: {
        senderId: req.userId!,
        phoneTarget: phone,
        token,
        businessCardId: cardImport.storageObjectId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({ where: { phone } });
    if (targetUser) {
      await prisma.connection.create({
        data: { requesterId: req.userId!, addresseeId: targetUser.id, status: "PENDING" },
      }).catch(() => {});
    }

    // Send SMS (skip demo)
    if (!req.isDemo) {
      const senderName = `${sender?.firstName || ""} ${sender?.lastName || ""}`.trim() || "Someone";
      const webUrl = process.env.WEB_URL || "http://localhost:3000";
      try {
        await twilioClient.messages.create({
          to: phone,
          from: TWILIO_PHONE,
          body: `${senderName} invited you to connect on Xpylon Connect. Join here: ${webUrl}/invite/${token}`,
        });
      } catch (smsErr) {
        console.error("SMS send error:", smsErr);
      }
    }

    // Update import status
    await prisma.cardImport.update({
      where: { id: importId },
      data: {
        status: "CONFIRMED",
        inviteId: invite.id,
        extractedData: { firstName, lastName, role, company, email, phone } as any,
      },
    });

    res.json({ invite, success: true });
  } catch (err) {
    console.error("Card import confirm error:", err);
    res.status(500).json({ error: "Failed to confirm import" });
  }
});

// POST /invites/imports/:id/skip — Skip this card
router.post("/imports/:id/skip", authMiddleware, async (req, res) => {
  try {
    const importId = req.params.id as string;
    const cardImport = await prisma.cardImport.findUnique({ where: { id: importId } });
    if (!cardImport) { res.status(404).json({ error: "Not found" }); return; }
    if (cardImport.userId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }

    await prisma.cardImport.update({
      where: { id: importId },
      data: { status: "SKIPPED" },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to skip import" });
  }
});

// GET /invites/sent — List sent invites with status (for network display)
router.get("/sent", authMiddleware, async (req, res) => {
  try {
    const invites = await prisma.invite.findMany({
      where: { senderId: req.userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        cardImport: {
          select: {
            extractedData: true,
            storageObject: { select: { bucket: true, key: true } },
          },
        },
      },
    });
    res.json({ invites });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sent invites" });
  }
});

export { router as invitesRouter };
