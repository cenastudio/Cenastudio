import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { RequestHandler } from "express";

type MockResponse = {
  statusCode: number;
  body: any;
  redirectedTo?: string;
  downloaded?: { filePath: string; filename?: string };
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  redirect: (url: string) => MockResponse;
  download: (filePath: string, filename?: string) => MockResponse;
};

let authService: typeof import("../services/authService.js");
let clientsController: typeof import("./clientsController.js");
let opportunitiesController: typeof import("./opportunitiesController.js");
let interactionsController: typeof import("./interactionsController.js");
let projectsController: typeof import("./projectsController.js");
let filesController: typeof import("./filesController.js");
let analyticsController: typeof import("./analyticsController.js");
let budgetController: typeof import("./budgetController.js");
let equipmentController: typeof import("./equipmentController.js");
let planAccess: typeof import("../middleware/planAccess.js");
let user: { id: number; email: string; role: "user" };

function response(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    redirect(url) { this.redirectedTo = url; return this; },
    download(filePath, filename) { this.downloaded = { filePath, filename }; return this; },
  };
}

async function invoke(handler: RequestHandler, req: Record<string, any>) {
  const res = response();
  let capturedError: unknown;
  await handler(req as any, res as any, (error?: unknown) => { capturedError = error; });
  if (capturedError) throw capturedError;
  return res;
}

describe("CRM, files and finance controller flow", () => {
  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-domain-flow-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    const dbModule = await import("../models/db.js");
    dbModule.initDatabase();
    authService = await import("../services/authService.js");
    clientsController = await import("./clientsController.js");
    opportunitiesController = await import("./opportunitiesController.js");
    interactionsController = await import("./interactionsController.js");
    projectsController = await import("./projectsController.js");
    filesController = await import("./filesController.js");
    analyticsController = await import("./analyticsController.js");
    budgetController = await import("./budgetController.js");
    equipmentController = await import("./equipmentController.js");
    planAccess = await import("../middleware/planAccess.js");
    user = await authService.registerUser(`Domain Flow`, `domain-${Date.now()}@example.com`, "password-123");
  });

  it("covers client, opportunity and interaction lifecycle", async () => {
    const client = await invoke(clientsController.createClient, {
      user,
      body: { name: "Cliente CRM", company: "Cena", email: "crm@example.com", total_spent: 10000 },
    });
    expect(client.body.data.name).toBe("Cliente CRM");

    const opportunity = await invoke(opportunitiesController.createOpportunity, {
      user,
      body: { clientId: client.body.data.id, title: "Job Comercial", stage: "proposal", estimatedValue: 30000, probability: 70 },
    });
    expect(opportunity.body.data.client_id).toBe(client.body.data.id);

    const interaction = await invoke(interactionsController.createInteraction, {
      user,
      body: { clientId: client.body.data.id, opportunityId: opportunity.body.data.id, type: "call", subject: "Briefing", nextFollowUp: "2099-01-01" },
    });
    expect(interaction.body.data.subject).toBe("Briefing");

    const updatedOpportunity = await invoke(opportunitiesController.updateOpportunity, {
      user,
      params: { id: String(opportunity.body.data.id) },
      body: { stage: "negotiation", probability: 85 },
    });
    expect(updatedOpportunity.body.data.stage).toBe("negotiation");

    const stats = await invoke(opportunitiesController.getPipelineStats, { user });
    expect(stats.body.data.totalOpportunities).toBeGreaterThanOrEqual(1);

    const followUps = await invoke(interactionsController.getUpcomingFollowUps, { user });
    expect(followUps.body.data.some((item: any) => item.id === interaction.body.data.id)).toBe(true);
  });

  it("covers project files using local storage fallback", async () => {
    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Projeto Arquivos", metadataJson: "{}" },
    });
    const fileData = Buffer.from("arquivo teste", "utf8").toString("base64");
    const uploaded = await invoke(filesController.uploadFile, {
      user,
      body: {
        projectId: project.body.data.id,
        fileName: "roteiro.txt",
        fileType: "text/plain",
        fileSize: 13,
        fileData,
      },
    });
    expect(uploaded.body.data.original_name).toBe("roteiro.txt");

    const listed = await invoke(filesController.listFiles, { user, params: { projectId: String(project.body.data.id) } });
    expect(listed.body.data).toHaveLength(1);

    const allFiles = await invoke(filesController.listAllFiles, { user });
    expect(allFiles.body.data.some((f: any) => f.id === uploaded.body.data.id)).toBe(true);
    expect(allFiles.body.data.find((f: any) => f.id === uploaded.body.data.id)?.project_name).toBe("Projeto Arquivos");

    const downloaded = await invoke(filesController.downloadFile, { user, params: { id: String(uploaded.body.data.id) } });
    expect(downloaded.redirectedTo).toBeUndefined();
    expect(downloaded.downloaded?.filename).toBe("roteiro.txt");

    const deleted = await invoke(filesController.deleteFile, { user, params: { id: String(uploaded.body.data.id) } });
    expect(deleted.body.success).toBe(true);
  });

  it("covers financial entries and overview", async () => {
    const income = await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { kind: "income", description: "Entrada", amount: 12000, status: "settled", category: "producao" },
    });
    const expense = await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { kind: "expense", description: "Despesa", amount: 3000, status: "pending", recurrence: "monthly" },
    });

    expect(income.body.data.status).toBe("settled");
    expect(expense.body.data.status).toBe("pending");

    const updatedExpense = await invoke(analyticsController.updateFinancialEntry, {
      user,
      params: { id: String(expense.body.data.id) },
      body: { status: "settled", paidAt: "2099-01-01" },
    });
    expect(updatedExpense.body.data.status).toBe("settled");

    const overview = await invoke(analyticsController.getFinancialOverview, { user });
    expect(overview.body.data.summary.receivedMonth).toBeGreaterThanOrEqual(12000);
    expect(overview.body.data.revenueSources.some((item: any) => item.category === "producao")).toBe(true);

    const removed = await invoke(analyticsController.deleteFinancialEntry, { user, params: { id: String(expense.body.data.id) } });
    expect(removed.body.data.id).toBe(expense.body.data.id);
  });

  it("covers budget tracking lifecycle with plan gating (F1)", async () => {
    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Projeto Orçamento", metadataJson: "{}" },
    });
    const projectId = String(project.body.data.id);

    // Test user starts on the Pro trial (registerUser default) — budgetTracking is Studio-only.
    // Exercise the actual route guard (requireStudioPlan), not just the controller.
    const budgetGate = planAccess.requireStudioPlan("budgetTracking");
    await expect(
      invoke(budgetGate, { user, params: { projectId } }),
    ).rejects.toMatchObject({ status: 402 });

    await authService.updateUserPlan(user.id, "studio");
    await invoke(budgetGate, { user, params: { projectId } }); // now passes (no throw)

    const baseline = await invoke(budgetController.updateBudgetBaseline, {
      user,
      params: { projectId },
      body: {
        totalAmount: 500000,
        currency: "BRL",
        categories: [
          { name: "Equipe", budgeted: 300000 },
          { name: "Equipamento", budgeted: 200000 },
        ],
      },
    });
    expect(baseline.body.data.total_amount ?? baseline.body.data.totalAmount).toBe(500000);

    const entry1 = await invoke(budgetController.addEntry, {
      user,
      params: { projectId },
      body: { category: "Equipe", description: "Diária cinegrafista", amount: 250000, entryDate: "2026-07-15" },
    });
    expect(entry1.body.data.category).toBe("Equipe");

    const entry2 = await invoke(budgetController.addEntry, {
      user,
      params: { projectId },
      body: { category: "Equipamento", description: "Aluguel câmera", amount: 220000, entryDate: "2026-07-16" },
    });

    const overview = await invoke(budgetController.getOverview, { user, params: { projectId } });
    expect(overview.body.data.totalSpent).toBe(470000);
    const equipeCategory = overview.body.data.byCategory.find((c: any) => c.name === "Equipe");
    expect(equipeCategory.pct).toBeCloseTo(250000 / 300000, 5);
    // Equipe at 83% -> warn; Equipamento at 110% -> over (Property 3).
    expect(overview.body.data.alerts).toEqual(
      expect.arrayContaining([
        { category: "Equipe", level: "warn" },
        { category: "Equipamento", level: "over" },
      ]),
    );

    const deleted = await invoke(budgetController.deleteEntry, { user, params: { id: String(entry2.body.data.id) } });
    expect(deleted.body.success).toBe(true);

    const overviewAfterDelete = await invoke(budgetController.getOverview, { user, params: { projectId } });
    expect(overviewAfterDelete.body.data.totalSpent).toBe(250000);
  });

  it("covers equipment inventory + booking overlap rejection (F2)", async () => {
    // `user` was upgraded to studio by the budget test above (shared fixture);
    // equipmentInventory is also Studio-only so this exercises the real gate too.
    const equipmentGate = planAccess.requireStudioPlan("equipmentInventory");
    await invoke(equipmentGate, { user }); // studio already active — should not throw

    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Projeto Equipamento", metadataJson: "{}" },
    });
    const projectId = project.body.data.id;

    const camera = await invoke(equipmentController.createEquipment, {
      user,
      body: { name: "Sony FX6", category: "camera", costPerDay: 50000 },
    });
    expect(camera.body.data.category).toBe("camera");

    const booking1 = await invoke(equipmentController.createBooking, {
      user,
      params: { id: String(camera.body.data.id) },
      body: { projectId, startDate: "2026-08-01", endDate: "2026-08-03" },
    });
    expect(booking1.body.data.status).toBe("booked");

    // Overlapping range on the same equipment must be rejected with 409.
    await expect(
      invoke(equipmentController.createBooking, {
        user,
        params: { id: String(camera.body.data.id) },
        body: { projectId, startDate: "2026-08-02", endDate: "2026-08-05" },
      }),
    ).rejects.toMatchObject({ status: 409 });

    // Non-overlapping range is accepted.
    const booking2 = await invoke(equipmentController.createBooking, {
      user,
      params: { id: String(camera.body.data.id) },
      body: { projectId, startDate: "2026-08-10", endDate: "2026-08-12" },
    });
    expect(booking2.body.data.id).not.toBe(booking1.body.data.id);

    const cancelled = await invoke(equipmentController.cancelBooking, {
      user,
      params: { id: String(booking1.body.data.id) },
    });
    expect(cancelled.body.success).toBe(true);

    // After cancelling booking1, its range is free again — no longer rejected.
    const booking3 = await invoke(equipmentController.createBooking, {
      user,
      params: { id: String(camera.body.data.id) },
      body: { projectId, startDate: "2026-08-01", endDate: "2026-08-03" },
    });
    expect(booking3.body.data.status).toBe("booked");
  });
});
