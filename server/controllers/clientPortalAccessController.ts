import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as clientPortalAuthService from "../services/clientPortalAuthService.js";
import { getClientPortalAllowance } from "../services/entitlementService.js";

function parseClientId(req: { params: Record<string, string> }): number {
  const clientId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(clientId)) throw new AppError("ID de cliente inválido", 400);
  return clientId;
}

function serializeStatus(record: clientPortalAuthService.ClientPortalAccessRecord | null, clientId: number) {
  if (!record) {
    return { clientId, active: false, email: null, lastLoginAt: null, createdAt: null };
  }
  return {
    clientId: record.clientId,
    active: record.active,
    email: record.email,
    lastLoginAt: record.lastLoginAt ? record.lastLoginAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  };
}

export const getPortalAccessStatus: RequestHandler = async (req, res, next) => {
  try {
    const clientId = parseClientId(req);
    const record = await clientPortalAuthService.getAccessStatus(req.user!.id, clientId);
    res.json({ success: true, data: serializeStatus(record, clientId) });
  } catch (e) {
    next(e);
  }
};

export const createPortalAccess: RequestHandler = async (req, res, next) => {
  try {
    const clientId = parseClientId(req);
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      throw new AppError("Email e senha são obrigatórios", 400);
    }
    const record = await clientPortalAuthService.createAccess(req.user!.id, clientId, email, password);
    res.json({ success: true, data: serializeStatus(record, clientId) });
  } catch (e) {
    next(e);
  }
};

export const updatePortalAccessStatus: RequestHandler = async (req, res, next) => {
  try {
    const clientId = parseClientId(req);
    const { active } = req.body as { active?: boolean };
    if (typeof active !== "boolean") throw new AppError("Campo 'active' é obrigatório", 400);
    const record = await clientPortalAuthService.setActive(req.user!.id, clientId, active);
    res.json({ success: true, data: serializeStatus(record, clientId) });
  } catch (e) {
    next(e);
  }
};

export const resetPortalPassword: RequestHandler = async (req, res, next) => {
  try {
    const clientId = parseClientId(req);
    const { password } = req.body as { password?: string };
    if (!password) throw new AppError("Senha é obrigatória", 400);
    await clientPortalAuthService.resetPassword(req.user!.id, clientId, password);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

export const getPortalAllowance: RequestHandler = async (req, res, next) => {
  try {
    const data = await getClientPortalAllowance(req.user!.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
