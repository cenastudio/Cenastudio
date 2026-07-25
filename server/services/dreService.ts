import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import * as budgetService from "./budgetService.js";

/**
 * DRE (Demonstrativo de Resultado) por Projeto (spec: dre-por-projeto).
 *
 * Cálculo em memória, sem view SQL nova:
 *   Receita bruta   = SUM(FinancialEntry.amount) WHERE kind='income' AND status='settled' AND projectId=X
 *   Deduções        = DreSettings.deductions aplicado sobre a receita bruta
 *   Receita líquida = Receita bruta - Deduções
 *   Custos diretos  = budgetService.getOverview(userId, projectId).totalSpent (reuso, sem duplicar)
 *   Resultado bruto = Receita líquida - Custos diretos
 *   Desp. alocadas  = DreSettings.allocatedExpense (fixed ou percent sobre a receita bruta)
 *   Resultado líq.  = Resultado bruto - Despesas alocadas
 */

const DEDUCTION_TYPES = new Set(["percent", "fixed"]);
const ALLOCATED_EXPENSE_MODES = new Set(["fixed", "percent"]);
const MAX_PERCENT_BASIS_POINTS = 10000; // 100%

export interface DreDeductionInput {
  name: string;
  type: "percent" | "fixed";
  value: number; // fixed: centavos; percent: pontos-base (10000 = 100%)
}

export interface DreDeduction extends DreDeductionInput {
  amount: number; // calculado, somente leitura
}

export interface DreAllocatedExpenseInput {
  mode: "fixed" | "percent";
  value: number;
}

export interface DreSettingsInput {
  deductions: DreDeductionInput[];
  allocatedExpense: DreAllocatedExpenseInput | null;
}

export interface DreReport {
  projectId: number;
  currency: string;
  grossRevenue: number;
  deductions: DreDeduction[];
  totalDeductions: number;
  netRevenue: number;
  directCosts: number;
  grossResult: number;
  allocatedExpense: number;
  netResult: number;
  hasRevenueData: boolean;
  hasBudgetData: boolean;
  currencyMismatch: boolean;
}

interface DreSettingsRecord {
  id: number;
  userId: number;
  projectId: number;
  deductions: DreDeductionInput[];
  allocatedExpenseMode: "fixed" | "percent" | null;
  allocatedExpenseValue: number | null;
}

/** Verifies the project belongs to userId, throwing 404 otherwise (ownership check). */
async function assertProjectOwnership(userId: number, projectId: number): Promise<void> {
  if (shouldUsePrisma) {
    const project = await prisma.project.findFirst({
      where: { id: BigInt(projectId), userId: BigInt(userId) },
      select: { id: true },
    });
    if (!project) throw new AppError("Projeto não encontrado", 404);
    return;
  }

  const project = db.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?").get(projectId, userId);
  if (!project) throw new AppError("Projeto não encontrado", 404);
}

function parseDeductions(value: unknown): DreDeductionInput[] {
  if (Array.isArray(value)) return value as DreDeductionInput[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeSettingsRecord(raw: any): DreSettingsRecord {
  return {
    id: Number(raw.id),
    userId: Number(raw.userId ?? raw.user_id),
    projectId: Number(raw.projectId ?? raw.project_id),
    deductions: parseDeductions(raw.deductions),
    allocatedExpenseMode: (raw.allocatedExpenseMode ?? raw.allocated_expense_mode) ?? null,
    allocatedExpenseValue:
      (raw.allocatedExpenseValue ?? raw.allocated_expense_value) === undefined ||
      (raw.allocatedExpenseValue ?? raw.allocated_expense_value) === null
        ? null
        : Number(raw.allocatedExpenseValue ?? raw.allocated_expense_value),
  };
}

/** Gets the DRE settings for a project, creating an empty one (no deductions/allocated expense) if none exists yet. */
export async function getOrCreateSettings(userId: number, projectId: number): Promise<DreSettingsRecord> {
  await assertProjectOwnership(userId, projectId);

  if (shouldUsePrisma) {
    const existing = await (prisma as any).dreSettings.findUnique({ where: { projectId: BigInt(projectId) } });
    if (existing) return normalizeSettingsRecord(existing);
    const created = await (prisma as any).dreSettings.create({
      data: { userId: BigInt(userId), projectId: BigInt(projectId) },
    });
    return normalizeSettingsRecord(created);
  }

  const existing = db.prepare("SELECT * FROM dre_settings WHERE project_id = ?").get(projectId) as any;
  if (existing) return normalizeSettingsRecord(existing);

  const result = db
    .prepare(
      "INSERT INTO dre_settings (user_id, project_id, deductions, created_at, updated_at) VALUES (?, ?, '[]', datetime('now'), datetime('now'))",
    )
    .run(userId, projectId);
  const created = db.prepare("SELECT * FROM dre_settings WHERE id = ?").get((result as any).lastInsertRowid);
  return normalizeSettingsRecord(created);
}

function validateSettingsInput(data: DreSettingsInput) {
  for (const deduction of data.deductions) {
    if (!deduction.name?.trim()) throw new AppError("Dedução sem nome", 400);
    if (!DEDUCTION_TYPES.has(deduction.type)) throw new AppError(`Tipo de dedução inválido para "${deduction.name}"`, 400);
    if (typeof deduction.value !== "number" || deduction.value < 0) {
      throw new AppError(`Valor inválido para a dedução "${deduction.name}"`, 400);
    }
    if (deduction.type === "percent" && deduction.value > MAX_PERCENT_BASIS_POINTS) {
      throw new AppError(`Percentual inválido para a dedução "${deduction.name}" (máximo 100%)`, 400);
    }
  }

  if (data.allocatedExpense) {
    if (!ALLOCATED_EXPENSE_MODES.has(data.allocatedExpense.mode)) {
      throw new AppError("Modo de despesa alocada inválido", 400);
    }
    if (typeof data.allocatedExpense.value !== "number" || data.allocatedExpense.value < 0) {
      throw new AppError("Valor de despesa alocada inválido", 400);
    }
    if (data.allocatedExpense.mode === "percent" && data.allocatedExpense.value > MAX_PERCENT_BASIS_POINTS) {
      throw new AppError("Percentual de despesa alocada inválido (máximo 100%)", 400);
    }
  }
}

/** Replaces the DRE settings: deductions list and allocated expense config. */
export async function updateSettings(
  userId: number,
  projectId: number,
  data: DreSettingsInput,
): Promise<DreSettingsRecord> {
  validateSettingsInput(data);

  const settings = await getOrCreateSettings(userId, projectId);

  if (shouldUsePrisma) {
    const updated = await (prisma as any).dreSettings.update({
      where: { id: BigInt(settings.id) },
      data: {
        deductions: data.deductions,
        allocatedExpenseMode: data.allocatedExpense?.mode ?? null,
        allocatedExpenseValue: data.allocatedExpense?.value ?? null,
        updatedAt: new Date(),
      },
    });
    return normalizeSettingsRecord(updated);
  }

  db.prepare(
    `UPDATE dre_settings
     SET deductions = ?, allocated_expense_mode = ?, allocated_expense_value = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    JSON.stringify(data.deductions),
    data.allocatedExpense?.mode ?? null,
    data.allocatedExpense?.value ?? null,
    settings.id,
  );
  const updated = db.prepare("SELECT * FROM dre_settings WHERE id = ?").get(settings.id);
  return normalizeSettingsRecord(updated);
}

interface RevenueAggregate {
  grossRevenue: number;
  hasRevenueData: boolean;
  currency: string | null;
}

async function getRevenue(userId: number, projectId: number): Promise<RevenueAggregate> {
  if (shouldUsePrisma) {
    const rows = await prisma.financialEntry.findMany({
      where: { userId: BigInt(userId), projectId: BigInt(projectId), kind: "income", status: "settled" },
      select: { amount: true },
    });
    return {
      grossRevenue: rows.reduce((sum, row) => sum + row.amount, 0),
      hasRevenueData: rows.length > 0,
      currency: null, // FinancialEntry não tem campo currency hoje; comparação feita via Budget.currency vs "BRL" implícito
    };
  }

  const rows = db
    .prepare(
      "SELECT amount FROM financial_entries WHERE user_id = ? AND project_id = ? AND kind = 'income' AND status = 'settled'",
    )
    .all(userId, projectId) as Array<{ amount: number }>;
  return {
    grossRevenue: rows.reduce((sum, row) => sum + row.amount, 0),
    hasRevenueData: rows.length > 0,
    currency: null,
  };
}

function applyDeductions(grossRevenue: number, deductions: DreDeductionInput[]): { rows: DreDeduction[]; total: number } {
  const rows: DreDeduction[] = deductions.map((deduction) => {
    const amount =
      deduction.type === "percent"
        ? Math.round((grossRevenue * deduction.value) / MAX_PERCENT_BASIS_POINTS)
        : deduction.value;
    return { ...deduction, amount };
  });
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return { rows, total };
}

function computeAllocatedExpense(
  grossRevenue: number,
  allocatedExpenseMode: "fixed" | "percent" | null,
  allocatedExpenseValue: number | null,
): number {
  if (!allocatedExpenseMode || allocatedExpenseValue === null) return 0;
  if (allocatedExpenseMode === "percent") {
    return Math.round((grossRevenue * allocatedExpenseValue) / MAX_PERCENT_BASIS_POINTS);
  }
  return allocatedExpenseValue;
}

/** Full DRE report for a project: revenue, deductions, direct costs (via budgetService), allocated expense, result. */
export async function getReport(userId: number, projectId: number): Promise<DreReport> {
  await assertProjectOwnership(userId, projectId);

  const [settings, revenue, budgetOverview] = await Promise.all([
    getOrCreateSettings(userId, projectId),
    getRevenue(userId, projectId),
    budgetService.getOverview(userId, projectId),
  ]);

  const { grossRevenue, hasRevenueData } = revenue;
  const { rows: deductions, total: totalDeductions } = applyDeductions(grossRevenue, settings.deductions);
  const netRevenue = grossRevenue - totalDeductions;
  const directCosts = budgetOverview.totalSpent;
  const grossResult = netRevenue - directCosts;
  const allocatedExpense = computeAllocatedExpense(
    grossRevenue,
    settings.allocatedExpenseMode,
    settings.allocatedExpenseValue,
  );
  const netResult = grossResult - allocatedExpense;
  const hasBudgetData = budgetOverview.totalBudgeted > 0 || budgetOverview.totalSpent > 0;
  // FinancialEntry não carrega moeda própria hoje; a única fonte de moeda por
  // projeto é Budget.currency. Sinaliza divergência apenas se o Budget usa
  // uma moeda diferente do padrão do sistema (BRL), sem bloquear o relatório.
  const currencyMismatch = hasBudgetData && budgetOverview.currency !== "BRL";

  return {
    projectId,
    currency: budgetOverview.currency,
    grossRevenue,
    deductions,
    totalDeductions,
    netRevenue,
    directCosts,
    grossResult,
    allocatedExpense,
    netResult,
    hasRevenueData,
    hasBudgetData,
    currencyMismatch,
  };
}
