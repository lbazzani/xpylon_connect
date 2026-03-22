import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      isDemo?: boolean;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }
  try {
    const { userId, isDemo } = verifyAccessToken(header.slice(7));
    req.userId = userId;
    req.isDemo = isDemo;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
