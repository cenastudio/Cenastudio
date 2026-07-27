import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler.js";
import { getUserById } from "../services/authService.js";
import { isTokenRevoked, trackSession } from "../services/sessionService.js";

export interface AuthUser {
  id: number;
  email: string;
  role: "user" | "admin";
  name?: string;
  studioName?: string;
  studioRole?: string;
  phone?: string;
  mustResetPassword?: boolean;
  twoFactorEnabled?: boolean;
  disabled?: boolean;
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
    { id: user.id, email: user.email, role: user.role, type: "app" as const },
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
    const payload = jwt.verify(token, getJwtSecret()) as AuthUser & { type?: string };

    // O token do Portal do Cliente é assinado com o mesmo segredo (ADR-012),
    // então `jwt.verify` sozinho não distingue os dois domínios. Rejeitar
    // explicitamente em vez de depender do efeito colateral da checagem de
    // e-mail mais abaixo. Ausência de `type` é aceita: tokens emitidos antes
    // desta mudança não têm a claim e continuam válidos até expirar.
    if (payload.type && payload.type !== "app") {
      return next(new AppError("Invalid or expired session", 401));
    }

    if (await isTokenRevoked(token)) {
      return next(new AppError("Invalid or expired session", 401));
    }

    const currentUser = await getUserById(payload.id);
    if (!currentUser || currentUser.email.toLowerCase() !== payload.email?.toLowerCase()) {
      return next(new AppError("Invalid or expired session", 401));
    }
    const resolvedUser = currentUser;

    // A suspended account keeps a technically-valid JWT until it expires, so
    // reject it here to cut active sessions the moment an admin disables it.
    if (resolvedUser.disabled) {
      return next(new AppError("Conta suspensa. Fale com o suporte.", 403));
    }

    req.user = resolvedUser;

    trackSession(resolvedUser.id, token, req.headers["user-agent"], req.ip);
    next();
  } catch {
    next(new AppError("Invalid or expired session", 401));
  }
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Forbidden", 403));
  }

  // Feature-flagged: require 2FA for admin access once the account has it
  // configured. Defaults OFF so this doesn't lock anyone out of the admin
  // panel before they've had a chance to set up 2FA on Profile → Security.
  // Turn on via env ADMIN_REQUIRE_2FA=true once the admin account(s) have
  // 2FA enabled.
  if (process.env.ADMIN_REQUIRE_2FA === "true" && !req.user.twoFactorEnabled) {
    return next(new AppError("2FA obrigatório para administradores. Ative em Perfil → Segurança.", 403));
  }

  next();
};
