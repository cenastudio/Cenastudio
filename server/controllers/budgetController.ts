import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as budgetService from "../services/budgetService.js";

function parseProjectId(req: { params: Record<string, string> }): number {
  const projectId = Number.parseInt(req.params.projectId, 10);
  if (!Number.isFinite(projectId)) throw new AppError("ID de projeto inválido", 400);
  return projectId;
}

export const getOverview: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseProjectId(req);
    const overview = await budgetService.getOverview(req.user!.id, projectId);
    res.json({ success: true, data: overview });
  } catch (e) {
    next(e);
  }
};

export const updateBudgetBaseline: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseProjectId(req);
    const { totalAmount, currency, categories } = req.body as {
      totalAmount?: number;
      currency?: string;
      categories?: Array<{ name: string; budgeted: number }>;
    };

    const budget = await budgetService.updateBudgetBaseline(req.user!.id, projectId, {
      totalAmount: totalAmount ?? 0,
      currency: currency?.trim() || "BRL",
      categories: Array.isArray(categories) ? categories : [],
    });
    res.json({ success: true, data: budget });
  } catch (e) {
    next(e);
  }
};

export const addEntry: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseProjectId(req);
    const { category, description, amount, entryDate, receiptUrl } = req.body as {
      category?: string;
      description?: string;
      amount?: number;
      entryDate?: string;
      receiptUrl?: string | null;
    };

    const entry = await budgetService.addEntry(req.user!.id, projectId, {
      category: category ?? "",
      description: description ?? "",
      amount: amount ?? 0,
      entryDate: entryDate ?? "",
      receiptUrl: receiptUrl ?? null,
    });
    const overview = await budgetService.getOverview(req.user!.id, projectId);
    res.status(201).json({ success: true, data: { entry, overview } });
  } catch (e) {
    next(e);
  }
};

export const deleteEntry: RequestHandler = async (req, res, next) => {
  try {
    const entryId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(entryId)) throw new AppError("ID inválido", 400);

    const deleted = await budgetService.deleteEntry(req.user!.id, entryId);
    if (!deleted) throw new AppError("Lançamento não encontrado", 404);

    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};
