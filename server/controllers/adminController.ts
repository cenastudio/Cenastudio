import type { RequestHandler } from "express";
import * as authService from "../services/authService.js";
import * as toolService from "../services/toolService.js";

export const listTools: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ success: true, data: await toolService.listAllTools() });
  } catch (e) {
    next(e);
  }
};

export const updateTool: RequestHandler = async (req, res, next) => {
  try {
    res.json({ success: true, data: await toolService.updateTool(req.params.id, req.body) });
  } catch (e) {
    next(e);
  }
};

export const createTool: RequestHandler = async (req, res, next) => {
  try {
    res.status(201).json({ success: true, data: await toolService.createTool(req.body) });
  } catch (e) {
    next(e);
  }
};

export const deleteTool: RequestHandler = async (req, res, next) => {
  try {
    res.json({ success: true, data: await toolService.softDeleteTool(req.params.id) });
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
