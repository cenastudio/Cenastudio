import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";

/**
 * Budget Tracking & Control (spec: landing-features-implementation, F1).
 *
 * One Budget per project (1:1), with a free-form list of categories
 * ({ name, budgeted }) and a flat list of BudgetEntry rows (actual spend).
 * Values are stored as Int cents, consistent with FinancialEntry.amount.
 *
 * Overview alerts: warn when a category's spent/budgeted ratio reaches 80%,
 * over when it reaches 100% (Property 3 in design.md).
 */

const WARN_THRESHOLD = 0.8;
const OVER_THRESHOLD = 1.0;

export interface BudgetCategory {
  name: string;
  budgeted: number;
}

export interface CategoryOverview {
  name: string;
  budgeted: number;
  spent: number;
  pct: number;
}

export interface BudgetAlert {
  category: string;
  level: "warn" | "over";
}

export interface BudgetOverview {
  budgetId: number;
  totalBudgeted: number;
  totalSpent: number;
  currency: string;
  byCategory: CategoryOverview[];
  alerts: BudgetAlert[];
  entries: BudgetEntryRecord[];
}

export interface BudgetEntryRecord {
  id: number;
  budget_id: number;
  category: string;
  description: string;
  amount: number;
  entry_date: string;
  receipt_url: string | null;
  created_at: string;
}

function serializeEntry(value: any) {
  return withSnakeCase(value, {
    budgetId: "budget_id",
    userId: "user_id",
    entryDate: "entry_date",
    receiptUrl: "receipt_url",
    createdAt: "created_at",
  });
}

function parseCategories(value: unknown): BudgetCategory[] {
  if (Array.isArray(value)) return value as BudgetCategory[];
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

function normalizeBudgetCategories(categories: unknown): BudgetCategory[] {
  if (!Array.isArray(categories)) throw new AppError("Categorias inválidas", 400);

  return categories.map((category) => {
    if (!category || typeof category !== "object" || typeof category.name !== "string") {
      throw new AppError("Categoria inválida", 400);
    }

    const name = category.name.trim();
    if (!name) throw new AppError("Categoria sem nome", 400);
    if (!Number.isSafeInteger(category.budgeted) || category.budgeted < 0) {
      throw new AppError(`Valor inválido para a categoria "${name}"`, 400);
    }

    return { name, budgeted: category.budgeted };
  });
}

function normalizeEntryDate(value: unknown): string {
  if (typeof value !== "string") throw new AppError("Data inválida", 400);

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new AppError("Data inválida", 400);

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsed.getUTCFullYear() !== Number(year)
    || parsed.getUTCMonth() !== Number(month) - 1
    || parsed.getUTCDate() !== Number(day)
  ) {
    throw new AppError("Data inválida", 400);
  }

  return value;
}

function normalizeReceiptUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new AppError("URL do comprovante inválida", 400);

  const receiptUrl = value.trim();
  try {
    const parsed = new URL(receiptUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new AppError("URL do comprovante inválida", 400);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("URL do comprovante inválida", 400);
  }

  return receiptUrl;
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

/** Gets the budget for a project, creating an empty one (0 categories) if none exists yet. */
export async function getOrCreateBudget(userId: number, projectId: number) {
  await assertProjectOwnership(userId, projectId);

  if (shouldUsePrisma) {
    return prisma.budget.upsert({
      where: { projectId: BigInt(projectId) },
      create: { userId: BigInt(userId), projectId: BigInt(projectId) },
      update: {},
    });
  }

  db
    .prepare("INSERT OR IGNORE INTO budgets (user_id, project_id, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))")
    .run(userId, projectId);
  return db.prepare("SELECT * FROM budgets WHERE project_id = ?").get(projectId);
}

/** Replaces the budget baseline: total amount, currency, and per-category budgeted values. */
export async function updateBudgetBaseline(
  userId: number,
  projectId: number,
  data: { totalAmount: number; currency: string; categories: BudgetCategory[] },
) {
  if (!Number.isSafeInteger(data.totalAmount) || data.totalAmount < 0) {
    throw new AppError("Valor de orçamento inválido", 400);
  }
  if (typeof data.currency !== "string" || !/^[A-Z]{3}$/.test(data.currency.trim().toUpperCase())) {
    throw new AppError("Moeda inválida", 400);
  }
  const categories = normalizeBudgetCategories(data.categories);
  const currency = data.currency.trim().toUpperCase();

  const budget = await getOrCreateBudget(userId, projectId);
  const budgetId = Number((budget as any).id);

  if (shouldUsePrisma) {
    return prisma.budget.update({
      where: { id: BigInt(budgetId) },
      data: {
        totalAmount: data.totalAmount,
        currency,
        categories,
        updatedAt: new Date(),
      },
    });
  }

  db.prepare(
    "UPDATE budgets SET total_amount = ?, currency = ?, categories = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(data.totalAmount, currency, JSON.stringify(categories), budgetId);
  return db.prepare("SELECT * FROM budgets WHERE id = ?").get(budgetId);
}

/** Adds a spend entry (category, description, amount in cents, date, optional receipt). */
export async function addEntry(
  userId: number,
  projectId: number,
  data: { category: string; description: string; amount: number; entryDate: string; receiptUrl?: string | null },
): Promise<BudgetEntryRecord> {
  if (typeof data.category !== "string" || !data.category.trim()) throw new AppError("Categoria é obrigatória", 400);
  if (typeof data.description !== "string" || !data.description.trim()) throw new AppError("Descrição é obrigatória", 400);
  if (!Number.isSafeInteger(data.amount) || data.amount <= 0) throw new AppError("Valor inválido", 400);
  const entryDate = normalizeEntryDate(data.entryDate);
  const receiptUrl = normalizeReceiptUrl(data.receiptUrl);

  const budget = await getOrCreateBudget(userId, projectId);
  const budgetId = Number((budget as any).id);

  if (shouldUsePrisma) {
    const created = await prisma.budgetEntry.create({
      data: {
        budgetId: BigInt(budgetId),
        userId: BigInt(userId),
        category: data.category.trim(),
        description: data.description.trim(),
        amount: data.amount,
        entryDate: new Date(`${entryDate}T00:00:00.000Z`),
        receiptUrl,
      },
    });
    return serializeEntry(created) as unknown as BudgetEntryRecord;
  }

  const result = db
    .prepare(
      `INSERT INTO budget_entries (budget_id, user_id, category, description, amount, entry_date, receipt_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .run(budgetId, userId, data.category.trim(), data.description.trim(), data.amount, entryDate, receiptUrl);

  return serializeEntry(
    db.prepare("SELECT * FROM budget_entries WHERE id = ?").get((result as any).lastInsertRowid),
  ) as unknown as BudgetEntryRecord;
}

/** Deletes a spend entry, scoped to the owning user (ownership enforced via budget.userId). */
export async function deleteEntry(userId: number, entryId: number): Promise<boolean> {
  if (shouldUsePrisma) {
    const result = await prisma.budgetEntry.deleteMany({
      where: { id: BigInt(entryId), userId: BigInt(userId) },
    });
    return result.count > 0;
  }

  const result = db.prepare("DELETE FROM budget_entries WHERE id = ? AND user_id = ?").run(entryId, userId);
  return (result as any).changes > 0;
}

/**
 * Aggregated overview: totalBudgeted, totalSpent, per-category budgeted/spent/pct,
 * and alerts (warn ≥80%, over ≥100%). totalSpent always equals the sum of all
 * budget_entries.amount for this budget (Property 3, design.md).
 */
export async function getOverview(userId: number, projectId: number): Promise<BudgetOverview> {
  const budget = await getOrCreateBudget(userId, projectId);
  const budgetId = Number((budget as any).id);
  const categories = parseCategories((budget as any).categories);
  const currency = (budget as any).currency ?? "BRL";

  let entries: BudgetEntryRecord[];
  if (shouldUsePrisma) {
    const rows = await prisma.budgetEntry.findMany({
      where: { budgetId: BigInt(budgetId) },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    });
    entries = rows.map((row) => serializeEntry(row) as unknown as BudgetEntryRecord);
  } else {
    entries = db
      .prepare("SELECT * FROM budget_entries WHERE budget_id = ? ORDER BY entry_date DESC, created_at DESC")
      .all(budgetId)
      .map((row: Record<string, unknown>) => serializeEntry(row) as unknown as BudgetEntryRecord);
  }

  const spentByCategory = new Map<string, number>();
  let totalSpent = 0;
  for (const entry of entries) {
    spentByCategory.set(entry.category, (spentByCategory.get(entry.category) ?? 0) + entry.amount);
    totalSpent += entry.amount;
  }

  // Categories not in the baseline but with entries still show up (spent-only, budgeted=0).
  const categoryNames = Array.from(new Set<string>([...categories.map((c) => c.name), ...Array.from(spentByCategory.keys())]));

  const byCategory: CategoryOverview[] = [];
  const alerts: BudgetAlert[] = [];
  for (const name of categoryNames) {
    const budgeted = categories.find((c) => c.name === name)?.budgeted ?? 0;
    const spent = spentByCategory.get(name) ?? 0;
    const pct = budgeted > 0 ? spent / budgeted : spent > 0 ? Infinity : 0;
    byCategory.push({ name, budgeted, spent, pct: Number.isFinite(pct) ? pct : 1 });

    if (budgeted > 0) {
      if (pct >= OVER_THRESHOLD) alerts.push({ category: name, level: "over" });
      else if (pct >= WARN_THRESHOLD) alerts.push({ category: name, level: "warn" });
    } else if (spent > 0) {
      alerts.push({ category: name, level: "over" });
    }
  }

  const totalBudgeted = categories.reduce((sum, c) => sum + c.budgeted, 0);

  return {
    budgetId,
    totalBudgeted,
    totalSpent,
    currency,
    byCategory,
    alerts,
    entries,
  };
}
