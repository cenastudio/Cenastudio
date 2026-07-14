import type { RequestHandler } from "express";
import * as authService from "../services/authService.js";
import * as toolService from "../services/toolService.js";
import * as adminService from "../services/adminService.js";
import { logAdminAction, listAdminActions } from "../services/adminAuditService.js";
import * as lgpdService from "../services/lgpdService.js";
import * as referralAdminService from "../services/referralAdminService.js";
import * as aiUsageService from "../services/aiUsageService.js";

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

// ─── LGPD requests (Phase 3) ───

export const listLgpdRequests: RequestHandler = async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    res.json({ success: true, data: await lgpdService.listAllLgpdRequests(status) });
  } catch (e) {
    next(e);
  }
};

export const processLgpdRequest: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Sessão expirada." });
      return;
    }
    const { status, notes } = req.body ?? {};
    if (!["completed", "rejected"].includes(status)) {
      res.status(400).json({ success: false, error: "status deve ser 'completed' ou 'rejected'." });
      return;
    }
    await lgpdService.processLgpdRequest(req.params.id, status, req.user.email, notes);
    audit(req, "lgpd.process", req.params.id, { status, notes });
    res.json({ success: true, data: { id: req.params.id, status } });
  } catch (e) {
    next(e);
  }
};

// ─── Referral program (Phase 3) ───

export const getReferralOverview: RequestHandler = async (_req, res, next) => {
  try {
    const [summary, entries] = await Promise.all([
      referralAdminService.getReferralAdminSummary(),
      referralAdminService.listAllReferrals(100),
    ]);
    res.json({ success: true, data: { summary, entries } });
  } catch (e) {
    next(e);
  }
};

// ─── AI usage (Phase 3) ───

export const getAiUsage: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ success: true, data: await aiUsageService.getAiUsageReport() });
  } catch (e) {
    next(e);
  }
};

// ─── Broadcast announcement (Phase 3) ───

export const broadcastAnnouncement: RequestHandler = async (req, res, next) => {
  try {
    const { title, message } = req.body ?? {};
    if (!title?.trim() || !message?.trim()) {
      res.status(400).json({ success: false, error: "Informe título e mensagem." });
      return;
    }
    const { notifyAllUsers } = await import("../services/notificationService.js");
    const count = await notifyAllUsers(title.trim(), message.trim(), "announcement");
    audit(req, "broadcast.send", null, { title, recipientCount: count });
    res.json({ success: true, data: { recipientCount: count } });
  } catch (e) {
    next(e);
  }
};
