import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler.js";
import { getActiveAccessByClientId } from "../services/clientPortalAuthService.js";

/**
 * Auth do Portal do Cliente (spec: portal-do-cliente).
 *
 * Deliberadamente separado de `authenticate.ts` (produtora): um cliente não
 * é um `User`, é um `Client`. Reaproveitar o mesmo cookie/JWT criaria
 * ambiguidade grave entre "logar como produtora" e "logar como cliente".
 * O campo `type: "client-portal"` no payload é uma camada extra de defesa —
 * qualquer rota do portal só aceita esse payload; qualquer rota da produtora
 * só aceita o payload antigo (`{ id, email, role }`).
 */
export interface ClientPortalUser {
  clientId: number;
  userId: number; // produtora dona do cliente — usado em todo filtro de query do portal
}

interface ClientPortalTokenPayload extends ClientPortalUser {
  type: "client-portal";
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      portalUser?: ClientPortalUser;
    }
  }
}

const PORTAL_COOKIE_NAME = "client_portal_token";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("JWT_SECRET is not configured", 500);
  }
  return secret;
}

export function signClientPortalToken(payload: ClientPortalUser): string {
  return jwt.sign(
    { clientId: payload.clientId, userId: payload.userId, type: "client-portal" },
    getJwtSecret(),
    { expiresIn: "7d" },
  );
}

export const portalCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export { PORTAL_COOKIE_NAME };

export const authenticateClientPortal: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[PORTAL_COOKIE_NAME];
  if (!token) {
    return next(new AppError("Unauthorized", 401));
  }
  try {
    const payload = jwt.verify(token, getJwtSecret()) as ClientPortalTokenPayload;

    if (payload.type !== "client-portal") {
      return next(new AppError("Invalid or expired session", 401));
    }

    const access = await getActiveAccessByClientId(payload.clientId);
    if (!access || !access.active || access.userId !== payload.userId) {
      return next(new AppError("Invalid or expired session", 401));
    }

    // Troca/redefinição de senha e desativação atualizam `updatedAt` — um
    // token emitido antes disso deixa de ser válido (invalida sessões
    // anteriores sem precisar de uma tabela de revogação própria).
    if (access.updatedAt.getTime() > payload.iat * 1000) {
      return next(new AppError("Invalid or expired session", 401));
    }

    req.portalUser = { clientId: payload.clientId, userId: payload.userId };
    next();
  } catch {
    next(new AppError("Invalid or expired session", 401));
  }
};
