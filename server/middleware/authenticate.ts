import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler.js";
import { ensureUserFromToken, getUserById } from "../services/authService.js";

export interface AuthUser {
  id: number;
  email: string;
  role: "user" | "admin";
  name?: string;
  studioName?: string;
  studioRole?: string;
  phone?: string;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      user?: AuthUser;
    }
  }
}

const COOKIE_NAME = "frame_token";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("JWT_SECRET is not configured", 500);
  }
  return secret;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: "7d" },
  );
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export { COOKIE_NAME };

export const authenticate: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return next(new AppError("Unauthorized", 401));
  }
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthUser;
    const currentUser = await getUserById(payload.id);
    if (!currentUser) {
      req.user = await ensureUserFromToken(payload);
      next();
      return;
    }
    req.user = currentUser;
    next();
  } catch {
    next(new AppError("Invalid or expired session", 401));
  }
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Forbidden", 403));
  }
  next();
};
