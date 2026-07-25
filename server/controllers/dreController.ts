import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as dreService from "../services/dreService.js";
import type { DreDeductionInput, DreAllocatedExpenseInput } from "../services/dreService.js";

function parseProjectId(req: { params: Record<string, string> }): number {
  const projectId = Number.parseInt(req.params.projectId, 10);
  if (!Number.isFinite(projectId)) throw new AppError("ID de projeto inválido", 400);
  return projectId;
}

export const getReport: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseProjectId(req);
    const report = await dreService.getReport(req.user!.id, projectId);
    res.json({ success: true, data: report });
  } catch (e) {
    next(e);
  }
};

export const updateSettings: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseProjectId(req);
    const { deductions, allocatedExpense } = req.body as {
      deductions?: DreDeductionInput[];
      allocatedExpense?: DreAllocatedExpenseInput | null;
    };

    const settings = await dreService.updateSettings(req.user!.id, projectId, {
      deductions: Array.isArray(deductions) ? deductions : [],
      allocatedExpense: allocatedExpense ?? null,
    });
    res.json({ success: true, data: settings });
  } catch (e) {
    next(e);
  }
};
