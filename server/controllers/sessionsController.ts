import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import { COOKIE_NAME } from "../middleware/authenticate.js";
import * as sessionService from "../services/sessionService.js";

/** GET /api/sessions — lists the authenticated user's active (non-revoked) sessions. */
export const listSessions: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const currentToken = req.cookies?.[COOKIE_NAME];
    if (!currentToken) throw new AppError("Unauthorized", 401);

    const sessions = await sessionService.listSessions(userId, currentToken);
    res.json({ success: true, data: sessions });
  } catch (e) {
    next(e);
  }
};

/** DELETE /api/sessions/:id — revokes a single session (cannot revoke the current one this way). */
export const revokeSession: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const sessionId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(sessionId)) throw new AppError("Session ID inválido", 400);

    const revoked = await sessionService.revokeSession(userId, sessionId);
    if (!revoked) throw new AppError("Sessão não encontrada", 404);

    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};

/** POST /api/sessions/revoke-others — revokes every session except the one making this request. */
export const revokeOtherSessions: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const currentToken = req.cookies?.[COOKIE_NAME];
    if (!currentToken) throw new AppError("Unauthorized", 401);

    const revokedCount = await sessionService.revokeAllOtherSessions(userId, currentToken);
    res.json({ success: true, data: { revokedCount } });
  } catch (e) {
    next(e);
  }
};
