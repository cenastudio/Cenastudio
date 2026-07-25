import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

let authService: typeof import("./authService.js");
let dreService: typeof import("./dreService.js");
let budgetService: typeof import("./budgetService.js");
let projectsController: typeof import("../controllers/projectsController.js");
let analyticsController: typeof import("../controllers/analyticsController.js");

type MockResponse = {
  statusCode: number;
  body: any;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
};

function response(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function invoke(handler: any, req: Record<string, any>) {
  const res = response();
  let capturedError: unknown;
  await handler(req, res, (error?: unknown) => { capturedError = error; });
  if (capturedError) throw capturedError;
  return res;
}

async function createProject(user: { id: number }, name: string): Promise<number> {
  const res = await invoke(projectsController.createProject, { user, body: { name, metadataJson: "{}" } });
  return res.body.data.id as number;
}

describe("dreService", () => {
  let user: { id: number; email: string; role: "user" };

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-dre-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    const dbModule = await import("../models/db.js");
    await dbModule.initDatabase();
    authService = await import("./authService.js");
    dreService = await import("./dreService.js");
    budgetService = await import("./budgetService.js");
    projectsController = await import("../controllers/projectsController.js");
    analyticsController = await import("../controllers/analyticsController.js");

    const registered = await authService.registerUser("Dre Tester", `dre-${Date.now()}@example.com`, "password-123");
    user = { ...registered, role: "user" };
  });

  it("returns zeros with hasRevenueData=false when no income is linked", async () => {
    const projectId = await createProject(user, "Projeto sem receita");
    const report = await dreService.getReport(user.id, projectId);

    expect(report.grossRevenue).toBe(0);
    expect(report.hasRevenueData).toBe(false);
    expect(report.hasBudgetData).toBe(false);
    expect(report.netResult).toBe(0);
  });

  it("only counts settled income linked to the project (pending/expense/other-project excluded)", async () => {
    const projectId = await createProject(user, "Projeto receita filtrada");
    const otherProjectId = await createProject(user, "Outro projeto");

    await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { projectId, kind: "income", description: "Receita paga", amount: 50000, status: "settled" },
    });
    await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { projectId, kind: "income", description: "Receita pendente", amount: 99999, status: "pending" },
    });
    await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { projectId, kind: "expense", description: "Despesa qualquer", amount: 1000, status: "settled" },
    });
    await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { projectId: otherProjectId, kind: "income", description: "Receita de outro projeto", amount: 30000, status: "settled" },
    });

    const report = await dreService.getReport(user.id, projectId);
    expect(report.grossRevenue).toBe(50000);
    expect(report.hasRevenueData).toBe(true);
  });

  it("applies a percent deduction correctly (basis points)", async () => {
    const projectId = await createProject(user, "Projeto dedução percentual");
    await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { projectId, kind: "income", description: "Receita", amount: 100000, status: "settled" },
    });
    await dreService.updateSettings(user.id, projectId, {
      deductions: [{ name: "ISS", type: "percent", value: 500 }], // 5%
      allocatedExpense: null,
    });

    const report = await dreService.getReport(user.id, projectId);
    expect(report.deductions[0].amount).toBe(5000);
    expect(report.totalDeductions).toBe(5000);
    expect(report.netRevenue).toBe(95000);
  });

  it("applies a fixed deduction correctly", async () => {
    const projectId = await createProject(user, "Projeto dedução fixa");
    await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { projectId, kind: "income", description: "Receita", amount: 100000, status: "settled" },
    });
    await dreService.updateSettings(user.id, projectId, {
      deductions: [{ name: "Taxa bancária", type: "fixed", value: 1500 }],
      allocatedExpense: null,
    });

    const report = await dreService.getReport(user.id, projectId);
    expect(report.deductions[0].amount).toBe(1500);
    expect(report.netRevenue).toBe(98500);
  });

  it("pulls direct costs from BudgetEntry via budgetService without duplicating logic", async () => {
    const projectId = await createProject(user, "Projeto custos diretos");
    await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { projectId, kind: "income", description: "Receita", amount: 200000, status: "settled" },
    });
    await budgetService.updateBudgetBaseline(user.id, projectId, {
      totalAmount: 100000,
      currency: "BRL",
      categories: [{ name: "Equipe", budgeted: 100000 }],
    });
    await budgetService.addEntry(user.id, projectId, {
      category: "Equipe",
      description: "Diária",
      amount: 80000,
      entryDate: "2026-07-01",
    });

    const report = await dreService.getReport(user.id, projectId);
    expect(report.directCosts).toBe(80000);
    expect(report.hasBudgetData).toBe(true);
    expect(report.grossResult).toBe(report.netRevenue - 80000);
  });

  it("computes allocated expense in both fixed and percent modes", async () => {
    const projectId = await createProject(user, "Projeto despesa alocada");
    await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { projectId, kind: "income", description: "Receita", amount: 100000, status: "settled" },
    });

    await dreService.updateSettings(user.id, projectId, {
      deductions: [],
      allocatedExpense: { mode: "fixed", value: 4000 },
    });
    const fixedReport = await dreService.getReport(user.id, projectId);
    expect(fixedReport.allocatedExpense).toBe(4000);

    await dreService.updateSettings(user.id, projectId, {
      deductions: [],
      allocatedExpense: { mode: "percent", value: 2000 }, // 20%
    });
    const percentReport = await dreService.getReport(user.id, projectId);
    expect(percentReport.allocatedExpense).toBe(20000);
  });

  it("shows a negative netResult correctly when costs exceed revenue", async () => {
    const projectId = await createProject(user, "Projeto resultado negativo");
    await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { projectId, kind: "income", description: "Receita pequena", amount: 10000, status: "settled" },
    });
    await budgetService.updateBudgetBaseline(user.id, projectId, {
      totalAmount: 50000,
      currency: "BRL",
      categories: [{ name: "Produção", budgeted: 50000 }],
    });
    await budgetService.addEntry(user.id, projectId, {
      category: "Produção",
      description: "Custo alto",
      amount: 50000,
      entryDate: "2026-07-01",
    });

    const report = await dreService.getReport(user.id, projectId);
    expect(report.netResult).toBeLessThan(0);
    expect(report.netResult).toBe(10000 - 50000);
  });

  it("flags currency mismatch without blocking the report", async () => {
    const projectId = await createProject(user, "Projeto moeda divergente");
    await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { projectId, kind: "income", description: "Receita", amount: 10000, status: "settled" },
    });
    await budgetService.updateBudgetBaseline(user.id, projectId, {
      totalAmount: 5000,
      currency: "USD",
      categories: [{ name: "Equipe", budgeted: 5000 }],
    });

    const report = await dreService.getReport(user.id, projectId);
    expect(report.currencyMismatch).toBe(true);
    expect(report.netResult).toBeDefined(); // report still computed, not blocked
  });

  it("rejects invalid settings (negative value, out-of-range percent)", async () => {
    const projectId = await createProject(user, "Projeto validação");

    await expect(
      dreService.updateSettings(user.id, projectId, {
        deductions: [{ name: "Inválida", type: "percent", value: -1 }],
        allocatedExpense: null,
      }),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      dreService.updateSettings(user.id, projectId, {
        deductions: [{ name: "Acima de 100%", type: "percent", value: 10001 }],
        allocatedExpense: null,
      }),
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      dreService.updateSettings(user.id, projectId, {
        deductions: [],
        allocatedExpense: { mode: "percent", value: 10001 },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 404 for a project that does not belong to the user", async () => {
    const otherUser = await authService.registerUser("Dre Outro", `dre-other-${Date.now()}@example.com`, "password-123");
    const projectId = await createProject(user, "Projeto privado");

    await expect(dreService.getReport(otherUser.id, projectId)).rejects.toMatchObject({ status: 404 });
    await expect(
      dreService.updateSettings(otherUser.id, projectId, { deductions: [], allocatedExpense: null }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
