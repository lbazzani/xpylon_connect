import { Router } from "express";
import prisma from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { authMiddleware } from "../middleware/auth";
// import twilio from "twilio"; // uncomment when Twilio credentials are set

const router = Router();

// Simple in-memory rate limiter
const otpAttempts = new Map<string, { count: number; resetAt: number }>();
const OTP_RATE_LIMIT = 5; // max attempts
const OTP_WINDOW = 15 * 60 * 1000; // 15 minutes

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
    // TODO: Twilio Verify — send OTP
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!).verifications.create({ to: phone, channel: "sms" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// POST /auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) { res.status(400).json({ error: "phone and code are required" }); return; }
    if (!checkRateLimit(phone)) {
      res.status(429).json({ error: "Too many attempts, try again later" });
      return;
    }

    // TODO: Twilio Verify — check OTP
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // const check = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!).verificationChecks.create({ to: phone, code });
    // if (check.status !== "approved") { res.status(401).json({ error: "Invalid OTP" }); return; }

    // For development: accept any code
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
    const { firstName, lastName, companyName } = req.body;
    if (!firstName || !lastName || !companyName) {
      res.status(400).json({ error: "firstName, lastName and companyName are required" });
      return;
    }

    let company = await prisma.company.findFirst({ where: { name: companyName } });
    if (!company) {
      company = await prisma.company.create({ data: { name: companyName } });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { firstName, lastName, companyId: company.id },
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
