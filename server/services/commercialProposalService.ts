import { createHash, randomBytes } from "node:crypto";
import { AppError } from "../middleware/errorHandler.js";
import { prisma } from "../models/prisma.js";

export type CommercialSnapshotSource = "ai-budget" | "manual" | "calculator";

export interface CommercialSnapshot {
  version: 1;
  source: CommercialSnapshotSource;
  generationId?: number;
  currency: string;
  categories: Array<{ key: string; label: string; total: number }>;
  subtotal: number;
  total: number;
  narrative?: string;
  generatedAt: string;
}

type BudgetSource = {
  id: bigint;
  totalAmount: number;
  currency: string;
  categories: unknown;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character] ?? character));
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

function renderNarrative(value?: string): string {
  if (!value) return "";

  return value
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function parseBudgetCategories(value: unknown): Array<{ key: string; label: string; total: number }> {
  if (!Array.isArray(value)) throw new AppError("As categorias do orçamento são inválidas", 409);

  return value.map((category, index) => {
    if (!category || typeof category !== "object") {
      throw new AppError("As categorias do orçamento são inválidas", 409);
    }

    const { name, budgeted } = category as { name?: unknown; budgeted?: unknown };
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof budgeted !== "number" ||
      !Number.isSafeInteger(budgeted) ||
      budgeted < 0
    ) {
      throw new AppError("As categorias do orçamento são inválidas", 409);
    }

    return { key: `budget-${index + 1}`, label: name.trim(), total: budgeted };
  });
}

export function buildCommercialSnapshot(
  budget: BudgetSource,
  source: CommercialSnapshotSource,
  generatedAt = new Date().toISOString(),
  aiContent?: { generationId: number; narrative: string },
): CommercialSnapshot {
  const currency = budget.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(budget.totalAmount) || budget.totalAmount <= 0) {
    throw new AppError("O orçamento precisa ter um valor válido antes de gerar uma proposta", 409);
  }

  const categories = parseBudgetCategories(budget.categories);
  const subtotal = categories.reduce((sum, category) => sum + category.total, 0);
  if (!categories.length || subtotal !== budget.totalAmount) {
    throw new AppError("O total do orçamento não corresponde às categorias. Revise o baseline antes de continuar.", 409);
  }

  return {
    version: 1,
    source,
    currency,
    categories,
    subtotal,
    total: subtotal,
    ...(aiContent ? { generationId: aiContent.generationId, narrative: aiContent.narrative } : {}),
    generatedAt,
  };
}

export function renderCommercialDraftHtml(title: string, snapshot: CommercialSnapshot): string {
  const rows = snapshot.categories
    .map((category) => `<tr><td>${escapeHtml(category.label)}</td><td>${formatCurrency(category.total, snapshot.currency)}</td></tr>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><main><p>Rascunho interno. Revise os valores comerciais antes de enviar ao cliente.</p><h1>${escapeHtml(title)}</h1>${renderNarrative(snapshot.narrative)}<table><tbody>${rows}</tbody><tfoot><tr><th>Total base</th><th>${formatCurrency(snapshot.total, snapshot.currency)}</th></tr></tfoot></table></main></body></html>`;
}

function proposalId(value: unknown, field: string): bigint | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = typeof value === "string" && !/^\d+$/.test(value.trim()) ? Number.NaN : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new AppError(`${field} inválido`, 400);
  return BigInt(parsed);
}

export async function createOrUpdateDraftFromBudget(
  userId: number,
  input: { projectId: unknown; sourceGenerationId?: unknown; source?: unknown },
) {
  const projectId = proposalId(input.projectId, "Projeto");
  if (!projectId) throw new AppError("Projeto é obrigatório", 400);
  const sourceGenerationId = proposalId(input.sourceGenerationId, "Geração de IA");
  const requestedSource = input.source ?? "manual";

  if (typeof requestedSource !== "string" || !(["ai-budget", "manual", "calculator"] as string[]).includes(requestedSource)) {
    throw new AppError("Origem comercial inválida", 400);
  }

  return prisma.$transaction(async (tx) => {
    const ownerId = BigInt(userId);
    const project = await tx.project.findFirst({
      where: { id: projectId, userId: ownerId },
      include: { client: true, budget: true },
    });
    if (!project) throw new AppError("Projeto não encontrado ou acesso não autorizado", 404);
    if (!project.clientId || !project.client) {
      throw new AppError("Associe um cliente ao projeto antes de criar uma proposta comercial", 409);
    }
    if (!project.budget) {
      throw new AppError("Defina o orçamento do projeto antes de criar uma proposta comercial", 409);
    }

    let aiContent: { generationId: number; narrative: string } | undefined;
    if (sourceGenerationId) {
      const generation = await tx.generation.findFirst({
        where: { id: sourceGenerationId, userId: ownerId, projectId },
        select: { id: true, output: true },
      });
      if (!generation) throw new AppError("Geração de IA não encontrada para este projeto", 404);
      const narrative = generation.output?.trim();
      if (narrative) {
        aiContent = {
          generationId: Number(generation.id),
          narrative,
        };
      }
    }

    const source: CommercialSnapshotSource = sourceGenerationId ? "ai-budget" : requestedSource as CommercialSnapshotSource;
    const snapshot = buildCommercialSnapshot(project.budget, source, new Date().toISOString(), aiContent);
    const title = `Proposta comercial — ${project.name}`;
    const html = renderCommercialDraftHtml(title, snapshot);
    const documentHash = createHash("sha256").update(html, "utf8").digest("hex");
    const existingDraft = await tx.proposal.findFirst({
      where: { userId: ownerId, sourceBudgetId: project.budget.id, status: "draft" },
      orderBy: { updatedAt: "desc" },
    });
    const data = {
      clientId: project.clientId,
      projectId: project.id,
      sourceBudgetId: project.budget.id,
      sourceGenerationId: sourceGenerationId ?? null,
      commercialSnapshot: snapshot,
      title,
      html,
      total: snapshot.total,
      documentHash,
    };

    if (existingDraft) {
      const proposal = await tx.proposal.update({
        where: { id: existingDraft.id },
        data,
        include: { client: { select: { name: true, email: true } } },
      });
      return { proposal, reused: true };
    }

    const proposal = await tx.proposal.create({
      data: {
        ...data,
        userId: ownerId,
        status: "draft",
        shareToken: randomBytes(24).toString("hex"),
      },
      include: { client: { select: { name: true, email: true } } },
    });
    return { proposal, reused: false };
  });
}
