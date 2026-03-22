import { Router } from "express";
import twilio from "twilio";
import prisma from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { authMiddleware } from "../middleware/auth";
import { createWelcomeConversation } from "../lib/bot";
import { generateAndSaveEmbedding } from "../lib/matching";

const router = Router();

// Twilio Verify client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID!;
const DEMO_OTP_CODE = process.env.DEMO_OTP_CODE || "116261";
const BOT_PHONE = process.env.XPYLON_BOT_PHONE || "+10000000000";

async function autoAcceptInvites(userId: string, phone: string): Promise<void> {
  const pendingInvites = await prisma.invite.findMany({
    where: { phoneTarget: phone, status: "PENDING" },
  });
  for (const invite of pendingInvites) {
    await prisma.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
    // Create connection if not exists
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: invite.senderId, addresseeId: userId },
          { requesterId: userId, addresseeId: invite.senderId },
        ],
      },
    });
    if (existing) {
      await prisma.connection.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
    } else {
      await prisma.connection.create({
        data: { requesterId: invite.senderId, addresseeId: userId, status: "ACCEPTED" },
      });
    }
  }
}

// Simple in-memory rate limiter
const otpAttempts = new Map<string, { count: number; resetAt: number }>();
const OTP_RATE_LIMIT = 5;
const OTP_WINDOW = 15 * 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = otpAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    otpAttempts.set(key, { count: 1, resetAt: now + OTP_WINDOW });
    return true;
  }
  if (entry.count >= OTP_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// GET /auth/demo-users — list available demo accounts (public endpoint)
router.get("/demo-users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isDemo: true,
        profileCompleted: true,
        phone: { not: BOT_PHONE },
      },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        bio: true,
        industry: true,
        company: { select: { name: true } },
      },
      orderBy: { firstName: "asc" },
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch demo users" });
  }
});

// POST /auth/request-otp
router.post("/request-otp", async (req, res) => {
  try {
    const { phone, isDemo } = req.body;
    if (!phone) { res.status(400).json({ error: "phone is required" }); return; }
    if (!checkRateLimit(phone)) {
      res.status(429).json({ error: "Too many attempts, try again later" });
      return;
    }

    // Demo mode: skip Twilio SMS
    if (isDemo) {
      res.json({ success: true });
      return;
    }

    await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });

    res.json({ success: true });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// POST /auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, code, isDemo } = req.body;
    console.log("OTP verify request:", { phone, code: code?.length + " digits", isDemo });
    if (!phone || !code) { res.status(400).json({ error: "phone and code are required" }); return; }
    if (!checkRateLimit(phone)) {
      res.status(429).json({ error: "Too many attempts, try again later" });
      return;
    }

    if (isDemo) {
      // Demo mode: verify against fixed code
      if (code !== DEMO_OTP_CODE) {
        res.status(401).json({ error: "Invalid demo code" });
        return;
      }

      // Prevent demo login on real user accounts
      const existingUser = await prisma.user.findUnique({ where: { phone } });
      if (existingUser && !existingUser.isDemo) {
        res.status(400).json({ error: "This phone number belongs to a real account" });
        return;
      }

      let user = existingUser;
      const isNewUser = !user;

      if (!user) {
        user = await prisma.user.create({
          data: { phone, firstName: "", lastName: "", isDemo: true },
        });
      }

      const accessToken = signAccessToken(user.id, true);
      const refreshToken = signRefreshToken(user.id, true);

      if (isNewUser) {
        createWelcomeConversation(user.id).catch(console.error);
      }

      res.json({ accessToken, refreshToken, isNewUser, isDemo: true });
      return;
    }

    // Normal mode: verify with Twilio
    const check = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });

    console.log("OTP check result:", { status: check.status, to: check.to, valid: check.valid });
    if (check.status !== "approved") {
      res.status(401).json({ error: "Invalid OTP" });
      return;
    }

    // Prevent real login on demo accounts
    let user = await prisma.user.findUnique({ where: { phone } });
    if (user && user.isDemo) {
      res.status(400).json({ error: "This phone number is a demo account" });
      return;
    }

    const isNewUser = !user;

    if (!user) {
      user = await prisma.user.create({
        data: { phone, firstName: "", lastName: "" },
      });
    }

    const accessToken = signAccessToken(user.id, false);
    const refreshToken = signRefreshToken(user.id, false);

    if (isNewUser) {
      createWelcomeConversation(user.id).catch(console.error);
    }

    res.json({ accessToken, refreshToken, isNewUser });
  } catch (err) {
    console.error("OTP verify error:", err);
    res.status(500).json({ error: "OTP verification failed" });
  }
});

// POST /auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) { res.status(400).json({ error: "refreshToken is required" }); return; }
    const { userId, isDemo } = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken(userId, isDemo);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// POST /auth/register
router.post("/register", authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, email, companyName, companyId } = req.body;
    if (!firstName || !lastName || !email || (!companyName && !companyId)) {
      res.status(400).json({ error: "firstName, lastName, email and company are required" });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail && existingEmail.id !== req.userId) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    // Resolve company: use existing ID or find/create by name
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId && companyName) {
      // Case-insensitive match to prevent duplicates
      let company = await prisma.company.findFirst({
        where: { name: { equals: companyName.trim(), mode: "insensitive" } },
      });
      if (!company) {
        company = await prisma.company.create({ data: { name: companyName.trim() } });
      }
      resolvedCompanyId = company.id;
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { firstName, lastName, email, companyId: resolvedCompanyId },
      include: { company: true },
    });

    // Generate profile embedding for matching
    generateAndSaveEmbedding(user.id).catch(console.error);

    // Auto-accept pending invites for this phone number
    autoAcceptInvites(user.id, user.phone).catch(console.error);

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// PATCH /auth/profile
router.patch("/profile", authMiddleware, async (req, res) => {
  try {
    const { bio, role } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { bio, role, profileCompleted: true },
      include: { company: true },
    });

    // Regenerate embedding with updated profile
    generateAndSaveEmbedding(user.id).catch(console.error);

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Profile update failed" });
  }
});

export { router as authRouter };
