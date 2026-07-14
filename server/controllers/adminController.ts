import type { RequestHandler } from "express";
import * as authService from "../services/authService.js";
import * as toolService from "../services/toolService.js";
import * as adminService from "../services/adminService.js";
import { logAdminAction, listAdminActions } from "../services/adminAuditService.js";

/** Best-effort audit log write, using the request's admin + context. */
function audit(req: Parameters<RequestHandler>[0], action: string, targetId?: string | number | null, details?: Record<string, unknown>) {
  if (!req.user) return;
  void logAdminAction({
    adminId: req.user.id,
    adminEmail: req.user.email,
    action,
    targetId,
    details,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });
}

export const listTools: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ success: true, data: await toolService.listAllTools() });
  } catch (e) {
    next(e);
  }
};

export const updateTool: RequestHandler = async (req, res, next) => {
  try {
    const result = await toolService.updateTool(req.params.id, req.body);
    audit(req, "tool.update", req.params.id, { changes: req.body });
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

export const createTool: RequestHandler = async (req, res, next) => {
  try {
    const result = await toolService.createTool(req.body);
    audit(req, "tool.create", req.body?.id, { name: req.body?.name });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

export const deleteTool: RequestHandler = async (req, res, next) => {
  try {
    const result = await toolService.softDeleteTool(req.params.id);
    audit(req, "tool.delete", req.params.id);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

export const listUsers: RequestHandler = async (_req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        count: await authService.countUsers(),
        users: await authService.listAllUsers(),
      },
    });
  } catch (e) {
    next(e);
  }
};

export const createManagedUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.createManagedUser(req.body);
    audit(req, "user.create", user.id, { email: req.body?.email, role: req.body?.role, planId: req.body?.planId });
    res.status(201).json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
};

export const updateUserRole: RequestHandler = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    await authService.updateUserRole(userId, role, req.user?.id);
    audit(req, "user.role_change", userId, { role });
    res.json({ success: true, data: { id: userId, role } });
  } catch (e) {
    next(e);
  }
};

export const updateUserPlan: RequestHandler = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { planId } = req.body;
    await authService.updateUserPlan(userId, planId);
    audit(req, "user.plan_change", userId, { planId });
    res.json({ success: true, data: { id: userId, planId } });
  } catch (e) {
    next(e);
  }
};

export const deleteManagedUser: RequestHandler = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: "Sessão expirada. Entre novamente para continuar." });
      return;
    }
    const deleted = await authService.deleteManagedUser(userId, req.user.id);
    audit(req, "user.delete", userId, { summary: (deleted as any)?.summary });
    res.json({ success: true, data: deleted });
  } catch (e) {
    next(e);
  }
};

// ─── Admin control center (Phase 1) ───

export const getUserDetail: RequestHandler = async (req, res, next) => {
  try {
    const detail = await adminService.getUserDetail(parseInt(req.params.id));
    res.json({ success: true, data: detail });
  } catch (e) {
    next(e);
  }
};

export const setUserDisabled: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: "Sessão expirada." });
      return;
    }
    const userId = parseInt(req.params.id);
    const disabled = Boolean(req.body?.disabled);
    await adminService.setUserDisabled(userId, disabled, req.user.id);
    audit(req, disabled ? "user.suspend" : "user.reactivate", userId);
    res.json({ success: true, data: { id: userId, disabled } });
  } catch (e) {
    next(e);
  }
};

export const updateUserSubscription: RequestHandler = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { planId, status, trialDays } = req.body ?? {};
    if (!planId || !["active", "trial", "canceled"].includes(status)) {
      res.status(400).json({ success: false, error: "Informe planId e status (active | trial | canceled)." });
      return;
    }
    await adminService.adminUpdateSubscription(userId, {
      planId,
      status,
      trialDays: trialDays != null ? Number(trialDays) : undefined,
    });
    audit(req, "user.subscription_change", userId, { planId, status, trialDays });
    res.json({ success: true, data: { id: userId, planId, status } });
  } catch (e) {
    next(e);
  }
};

export const resetUserPassword: RequestHandler = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const result = await adminService.forcePasswordReset(userId);
    // Never log the temp password itself — only that a reset happened.
    audit(req, "user.password_reset", userId);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

export const getMetrics: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ success: true, data: await adminService.getAdminMetrics() });
  } catch (e) {
    next(e);
  }
};

// ─── Admin audit log (Phase 2) ───

export const getAuditLog: RequestHandler = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "100")) || 100, 500);
    res.json({ success: true, data: await listAdminActions(limit) });
  } catch (e) {
    next(e);
  }
};
