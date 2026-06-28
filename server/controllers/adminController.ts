import type { RequestHandler } from "express";
import * as authService from "../services/authService.js";
import * as toolService from "../services/toolService.js";

export const listTools: RequestHandler = (_req, res, next) => {
  try {
    res.json({ success: true, data: toolService.listAllTools() });
  } catch (e) {
    next(e);
  }
};

export const updateTool: RequestHandler = (req, res, next) => {
  try {
    res.json({ success: true, data: toolService.updateTool(req.params.id, req.body) });
  } catch (e) {
    next(e);
  }
};

export const createTool: RequestHandler = (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: toolService.createTool(req.body) });
  } catch (e) {
    next(e);
  }
};

export const deleteTool: RequestHandler = (req, res, next) => {
  try {
    res.json({ success: true, data: toolService.softDeleteTool(req.params.id) });
  } catch (e) {
    next(e);
  }
};

export const listUsers: RequestHandler = (_req, res, next) => {
  try {
    res.json({
      success: true,
      data: { count: authService.countUsers(), users: authService.listAllUsers() },
    });
  } catch (e) {
    next(e);
  }
};

export const createManagedUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.createManagedUser(req.body);
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
    res.json({ success: true, data: deleted });
  } catch (e) {
    next(e);
  }
};
