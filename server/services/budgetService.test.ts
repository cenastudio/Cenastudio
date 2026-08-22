import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let budgetService: typeof import("./budgetService.js");
let budgetController: typeof import("../controllers/budgetController.js");
let db: typeof import("../models/db.js").db;

type MockResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
};

function response(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function invoke(handler: any, req: Record<string, unknown>) {
  const res = response();
  let capturedError: unknown;
  await handler(req, res, (error?: unknown) => {
    capturedError = error;
  });
  if (capturedError) throw capturedError;
  return res;
}

describe("budgetService", () => {
  const userId = 1;
  const projectId = 1;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-budget-")), "test.db");
    delete process.env.SUPABASE_DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    const dbModule = await import("../models/db.js");
    await dbModule.initDatabase();
    db = dbModule.db;
    budgetService = await import("./budgetService.js");
    budgetController = await import("../controllers/budgetController.js");
  });

  beforeEach(() => {
    db.prepare("DELETE FROM budget_entries").run();
    db.prepare("DELETE FROM budgets").run();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM users").run();
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(userId, "budget@example.com", "hash");
    db.prepare("INSERT INTO projects (id, user_id, name) VALUES (?, ?, ?)").run(projectId, userId, "Projeto orçamento");
  });

  it("persists an entry and includes the server ledger in the refreshed overview", async () => {
    await budgetService.updateBudgetBaseline(userId, projectId, {
      totalAmount: 100_000,
      currency: "BRL",
      categories: [{ name: "Equipe", budgeted: 100_000 }],
    });

    await budgetService.addEntry(userId, projectId, {
      category: "Equipe",
      description: "Diária de câmera",
      amount: 12_550,
      entryDate: "2026-08-17",
    });

    const overview = await budgetService.getOverview(userId, projectId);

    expect(overview.totalSpent).toBe(12_550);
    expect(overview.byCategory).toContainEqual({ name: "Equipe", budgeted: 100_000, spent: 12_550, pct: 0.1255 });
    expect(overview).toMatchObject({
      entries: [
        expect.objectContaining({
          category: "Equipe",
          description: "Diária de câmera",
          amount: 12_550,
          entry_date: "2026-08-17",
        }),
      ],
    });
  });

  it.each([
    [{ category: "Equipe", description: "Fracionado", amount: 100.5, entryDate: "2026-08-17" }],
    [{ category: "Equipe", description: "Data impossível", amount: 100, entryDate: "2026-02-30" }],
    [{ category: "Equipe", description: "Data não textual", amount: 100, entryDate: 20260817 }],
    [{ category: "Equipe", description: "Comprovante inválido", amount: 100, entryDate: "2026-08-17", receiptUrl: 123 }],
  ])("rejects malformed spend data as a domain error", async (data) => {
    await expect(budgetService.addEntry(userId, projectId, data as any)).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a malformed budget baseline as a domain error", async () => {
    await expect(budgetService.updateBudgetBaseline(userId, projectId, {
      totalAmount: 10_000,
      currency: "BRL",
      categories: "Equipe" as any,
    })).rejects.toMatchObject({ status: 400 });
  });

  it("returns the new entry and refreshed overview from the endpoint", async () => {
    await budgetService.updateBudgetBaseline(userId, projectId, {
      totalAmount: 20_000,
      currency: "BRL",
      categories: [{ name: "Locação", budgeted: 20_000 }],
    });

    const res = await invoke(budgetController.addEntry, {
      user: { id: userId },
      params: { projectId: String(projectId) },
      body: {
        category: "Locação",
        description: "Luz",
        amount: 5_000,
        entryDate: "2026-08-17",
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        entry: expect.objectContaining({ description: "Luz", amount: 5_000 }),
        overview: expect.objectContaining({ totalSpent: 5_000 }),
      },
    });
  });
});
