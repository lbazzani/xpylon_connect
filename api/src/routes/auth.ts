import { Router } from "express";
import twilio from "twilio";
import prisma from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Twilio Verify client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID!;

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

// POST /auth/request-otp
router.post("/request-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) { res.status(400).json({ error: "phone is required" }); return; }
    if (!checkRateLimit(phone)) {
      res.status(429).json({ error: "Too many attempts, try again later" });
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
    const { phone, code } = req.body;
    console.log("OTP verify request:", { phone, code: code?.length + " digits" });
    if (!phone || !code) { res.status(400).json({ error: "phone and code are required" }); return; }
    if (!checkRateLimit(phone)) {
      res.status(429).json({ error: "Too many attempts, try again later" });
      return;
    }

    const check = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });

    console.log("OTP check result:", { status: check.status, to: check.to, valid: check.valid });
    if (check.status !== "approved") {
      res.status(401).json({ error: "Invalid OTP" });
      return;
    }

    let user = await prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;

    if (!user) {
      user = await prisma.user.create({
        data: { phone, firstName: "", lastName: "" },
      });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);
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
    const { userId } = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken(userId);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// POST /auth/register
router.post("/register", authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, email, companyName } = req.body;
    if (!firstName || !lastName || !email || !companyName) {
      res.status(400).json({ error: "firstName, lastName, email and companyName are required" });
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

    let company = await prisma.company.findFirst({ where: { name: companyName } });
    if (!company) {
      company = await prisma.company.create({ data: { name: companyName } });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { firstName, lastName, email, companyId: company.id },
      include: { company: true },
    });
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
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Profile update failed" });
  }
});

export { router as authRouter };
