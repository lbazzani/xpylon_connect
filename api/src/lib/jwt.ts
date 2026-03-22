import jwt from "jsonwebtoken";

const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";

if (NODE_ENV === "production" && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be set in production");
}

export function signAccessToken(userId: string, isDemo: boolean = false): string {
  return jwt.sign({ userId, isDemo }, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(userId: string, isDemo: boolean = false): string {
  return jwt.sign({ userId, isDemo }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): { userId: string; isDemo: boolean } {
  const payload = jwt.verify(token, JWT_SECRET) as { userId: string; isDemo?: boolean };
  return { userId: payload.userId, isDemo: payload.isDemo || false };
}

export function verifyRefreshToken(token: string): { userId: string; isDemo: boolean } {
  const payload = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; isDemo?: boolean };
  return { userId: payload.userId, isDemo: payload.isDemo || false };
}
