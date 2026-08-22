import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  project: { findFirst: vi.fn() },
  generation: { findFirst: vi.fn() },
  proposal: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

vi.mock("../models/prisma.js", () => ({ prisma: prismaMock }));

import {
  buildCommercialSnapshot,
  createOrUpdateDraftFromBudget,
  renderCommercialDraftHtml,
} from "./commercialProposalService.js";

const budget = {
  id: 9n,
  totalAmount: 100_000,
  currency: "BRL",
  categories: [
    { name: "Equipe", budgeted: 70_000 },
    { name: "Pós-produção", budgeted: 30_000 },
  ],
};

describe("commercialProposalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock));
    prismaMock.project.findFirst.mockResolvedValue({
      id: 7n,
      userId: 1n,
      clientId: 2n,
      name: "Filme Horizonte",
      client: { name: "Aurora", email: "contato@aurora.test" },
      budget,
    });
    prismaMock.proposal.findFirst.mockResolvedValue(null);
    prismaMock.proposal.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 12n,
      ...data,
      client: { name: "Aurora", email: "contato@aurora.test" },
    }));
  });

  it("builds an immutable snapshot from the budget categories", () => {
    expect(buildCommercialSnapshot(budget, "ai-budget", "2026-08-22T00:00:00.000Z")).toEqual({
      version: 1,
      source: "ai-budget",
      currency: "BRL",
      categories: [
        { key: "budget-1", label: "Equipe", total: 70_000 },
        { key: "budget-2", label: "Pós-produção", total: 30_000 },
      ],
      subtotal: 100_000,
      total: 100_000,
      generatedAt: "2026-08-22T00:00:00.000Z",
    });
  });

  it("refuses a budget whose persisted total no longer matches its categories", () => {
    expect(() => buildCommercialSnapshot({ ...budget, totalAmount: 99_999 }, "manual")).toThrowError(
      expect.objectContaining({ status: 409 }),
    );
  });

  it("creates a draft without changing any sent proposal", async () => {
    const result = await createOrUpdateDraftFromBudget(1, { projectId: 7, source: "ai-budget" });

    expect(result.reused).toBe(false);
    expect(prismaMock.proposal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "draft",
        sourceBudgetId: 9n,
        projectId: 7n,
        commercialSnapshot: expect.objectContaining({ source: "ai-budget", total: 100_000 }),
      }),
    }));
    expect(prismaMock.proposal.update).not.toHaveBeenCalled();
  });

  it("updates only an existing draft for the same source budget", async () => {
    prismaMock.proposal.findFirst.mockResolvedValue({ id: 15n, status: "draft" });
    prismaMock.proposal.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 15n,
      ...data,
      client: { name: "Aurora", email: "contato@aurora.test" },
    }));

    const result = await createOrUpdateDraftFromBudget(1, { projectId: 7 });

    expect(result.reused).toBe(true);
    expect(prismaMock.proposal.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 15n } }));
    expect(prismaMock.proposal.create).not.toHaveBeenCalled();
  });

  it("requires a client before turning internal costs into a commercial draft", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 7n, clientId: null, client: null, budget });

    await expect(createOrUpdateDraftFromBudget(1, { projectId: 7 })).rejects.toMatchObject({ status: 409 });
  });

  it("refuses a project that does not belong to the signed-in studio", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);

    await expect(createOrUpdateDraftFromBudget(2, { projectId: 7 })).rejects.toMatchObject({ status: 404 });
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 7n, userId: 2n },
    }));
  });

  it("never selects a sent proposal as a mutable draft", async () => {
    await createOrUpdateDraftFromBudget(1, { projectId: 7 });

    expect(prismaMock.proposal.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "draft" }),
    }));
  });

  it("records the persisted AI generation as escaped commercial narrative", async () => {
    prismaMock.generation.findFirst.mockResolvedValue({
      id: 33n,
      output: "Solução sob medida.\n\n<script>alert(1)</script>",
    });

    await createOrUpdateDraftFromBudget(1, {
      projectId: 7,
      source: "manual",
      sourceGenerationId: 33,
    });

    expect(prismaMock.proposal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceGenerationId: 33n,
        commercialSnapshot: expect.objectContaining({
          source: "ai-budget",
          generationId: 33,
          narrative: "Solução sob medida.\n\n<script>alert(1)</script>",
        }),
      }),
    }));
    const html = prismaMock.proposal.create.mock.calls[0][0].data.html as string;
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("renders source labels as text, never executable markup", () => {
    const snapshot = buildCommercialSnapshot({
      ...budget,
      categories: [{ name: '<img src=x onerror="alert(1)">', budgeted: 100_000 }],
    }, "manual");

    expect(renderCommercialDraftHtml("<script>alert(1)</script>", snapshot)).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(renderCommercialDraftHtml("Título", snapshot)).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});
