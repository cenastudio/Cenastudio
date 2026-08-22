import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as clientPortalAuthService from "../services/clientPortalAuthService.js";
import {
  PORTAL_COOKIE_NAME,
  portalCookieOptions,
  signClientPortalToken,
} from "../middleware/authenticateClientPortal.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      throw new AppError("Email e senha são obrigatórios", 400);
    }
    const { clientId, userId } = await clientPortalAuthService.login(email, password);
    const token = signClientPortalToken({ clientId, userId });
    res.cookie(PORTAL_COOKIE_NAME, token, portalCookieOptions);
    res.json({ success: true, data: { clientId } });
  } catch (e) {
    next(e);
  }
};

export const activate: RequestHandler = async (req, res, next) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token?.trim() || !password) {
      throw new AppError("Token e senha são obrigatórios", 400);
    }
    const { clientId, userId } = await clientPortalAuthService.activateWithToken(token, password);
    const sessionToken = signClientPortalToken({ clientId, userId });
    res.cookie(PORTAL_COOKIE_NAME, sessionToken, portalCookieOptions);
    res.json({ success: true, data: { clientId } });
  } catch (e) {
    next(e);
  }
};

export const logout: RequestHandler = async (_req, res) => {
  res.clearCookie(PORTAL_COOKIE_NAME, { path: "/" });
  res.json({ success: true });
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const { clientId } = req.portalUser!;
    const client = shouldUsePrisma
      ? await prisma.client.findUnique({ where: { id: BigInt(clientId) }, select: { id: true, name: true, email: true, company: true } })
      : (db.prepare("SELECT id, name, email, company FROM clients WHERE id = ?").get(clientId) as any);
    if (!client) throw new AppError("Cliente não encontrado", 404);
    res.json({
      success: true,
      data: {
        id: Number(client.id),
        name: client.name,
        email: client.email,
        company: client.company,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const changePassword: RequestHandler = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      throw new AppError("Senha atual e nova senha são obrigatórias", 400);
    }
    const { clientId, userId } = req.portalUser!;
    await clientPortalAuthService.changePassword(clientId, currentPassword, newPassword);
    // A troca de senha faz bump de updatedAt (invalida sessões em outros
    // dispositivos, comportamento de segurança desejado), mas o Requisito 3.3
    // exige manter a sessão ATUAL ativa — reemite o cookie com iat novo para
    // esta requisição não ser invalidada na próxima chamada.
    const token = signClientPortalToken({ clientId, userId });
    res.cookie(PORTAL_COOKIE_NAME, token, portalCookieOptions);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};
