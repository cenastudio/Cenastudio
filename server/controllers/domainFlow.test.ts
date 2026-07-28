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
  headers: Record<string, string>;
  sent?: string;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  redirect: (url: string) => MockResponse;
  download: (filePath: string, filename?: string) => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
  send: (body: string) => MockResponse;
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
let shotListController: typeof import("./shotListController.js");
let timesheetController: typeof import("./timesheetController.js");
let calendarController: typeof import("./calendarController.js");
let dreController: typeof import("./dreController.js");
let planAccess: typeof import("../middleware/planAccess.js");
let sqliteDb: typeof import("../models/db.js").db;
let user: { id: number; email: string; role: "user" };

function response(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    redirect(url) { this.redirectedTo = url; return this; },
    download(filePath, filename) { this.downloaded = { filePath, filename }; return this; },
    setHeader(name, value) { this.headers[name] = value; return this; },
    send(body) { this.sent = body; return this; },
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
    await dbModule.initDatabase();
    authService = await import("../services/authService.js");
    clientsController = await import("./clientsController.js");
    opportunitiesController = await import("./opportunitiesController.js");
    interactionsController = await import("./interactionsController.js");
    projectsController = await import("./projectsController.js");
    filesController = await import("./filesController.js");
    analyticsController = await import("./analyticsController.js");
    budgetController = await import("./budgetController.js");
    equipmentController = await import("./equipmentController.js");
    shotListController = await import("./shotListController.js");
    timesheetController = await import("./timesheetController.js");
    calendarController = await import("./calendarController.js");
    dreController = await import("./dreController.js");
    planAccess = await import("../middleware/planAccess.js");
    sqliteDb = dbModule.db;
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

  it("rejects cross-tenant CRM and financial links", async () => {
    const otherUser = await authService.registerUser(
      "Outro Tenant",
      `other-${Date.now()}@example.com`,
      "password-123",
    );
    const ownClient = await invoke(clientsController.createClient, {
      user,
      body: { name: "Cliente do tenant A" },
    });
    const foreignClient = await invoke(clientsController.createClient, {
      user: otherUser,
      body: { name: "Cliente do tenant B" },
    });
    const foreignOpportunity = await invoke(opportunitiesController.createOpportunity, {
      user: otherUser,
      body: { clientId: foreignClient.body.data.id, title: "Oportunidade B" },
    });

    await expect(invoke(opportunitiesController.createOpportunity, {
      user,
      body: { clientId: foreignClient.body.data.id, title: "Tentativa cross-tenant" },
    })).rejects.toMatchObject({ status: 404 });

    await expect(invoke(interactionsController.createInteraction, {
      user,
      body: { clientId: ownClient.body.data.id, opportunityId: foreignOpportunity.body.data.id, notes: "cross-tenant" },
    })).rejects.toMatchObject({ status: 404 });

    await expect(invoke(analyticsController.createFinancialEntry, {
      user,
      body: { clientId: foreignClient.body.data.id, kind: "income", description: "Cross-tenant", amount: 1000 },
    })).rejects.toMatchObject({ status: 404 });

    const ownEntry = await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { clientId: ownClient.body.data.id, kind: "income", description: "Válido", amount: 1000, dueDate: "2099-01-01" },
    });
    await expect(invoke(analyticsController.updateFinancialEntry, {
      user,
      params: { id: String(ownEntry.body.data.id) },
      body: { clientId: foreignClient.body.data.id },
    })).rejects.toMatchObject({ status: 404 });

    const cleared = await invoke(analyticsController.updateFinancialEntry, {
      user,
      params: { id: String(ownEntry.body.data.id) },
      body: { clientId: null, dueDate: null, status: "pending" },
    });
    expect(cleared.body.data.client_id).toBeNull();
    expect(cleared.body.data.due_date).toBeNull();
    expect(cleared.body.data.paid_at).toBeNull();
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

    // Ownership: ninguém grava baseline em projeto de outro usuário. A ponte
    // Orçamento IA → módulo (ADR-013) manda `projectId` do cliente, então esta
    // é a barreira que impede escrever no projeto alheio.
    const intruder = await authService.registerUser(
      "Intruso Orçamento",
      `intruder-${Date.now()}@example.com`,
      "password-123",
    );
    await expect(
      invoke(budgetController.updateBudgetBaseline, {
        user: intruder,
        params: { projectId },
        body: { totalAmount: 1000, currency: "BRL", categories: [{ name: "Equipe", budgeted: 1000 }] },
      }),
    ).rejects.toMatchObject({ status: 404 });
    const overviewUntouched = await invoke(budgetController.getOverview, { user, params: { projectId } });
    expect(overviewUntouched.body.data.totalBudgeted).toBe(500000);
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

  it("covers shot list lifecycle with stable reordering (F3)", async () => {
    // shotList entitlement is Pro+ (already satisfied — user is on studio from the budget test).
    const shotListGate = planAccess.requireStudioPlan("shotList");
    await invoke(shotListGate, { user }); // should not throw

    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Projeto Shot List", metadataJson: "{}" },
    });
    const projectId = String(project.body.data.id);

    const shot1 = await invoke(shotListController.addShot, {
      user,
      params: { projectId },
      body: { scene: "1A", shotType: "wide", description: "Estabelecimento" },
    });
    const shot2 = await invoke(shotListController.addShot, {
      user,
      params: { projectId },
      body: { scene: "1B", shotType: "close", description: "Reação" },
    });
    const shot3 = await invoke(shotListController.addShot, {
      user,
      params: { projectId },
      body: { scene: "1C", shotType: "medium", description: "Diálogo" },
    });

    const listed = await invoke(shotListController.getShotList, { user, params: { projectId } });
    expect(listed.body.data.shots.map((s: any) => s.id)).toEqual([
      shot1.body.data.id,
      shot2.body.data.id,
      shot3.body.data.id,
    ]);
    expect(listed.body.data.shots.map((s: any) => s.order_index)).toEqual([0, 1, 2]);

    // Reorder: 3, 1, 2 — orderIndex must become contiguous 0..n-1 reflecting this exact order.
    const newOrder = [shot3.body.data.id, shot1.body.data.id, shot2.body.data.id];
    const reordered = await invoke(shotListController.reorderShots, {
      user,
      params: { projectId },
      body: { orderedIds: newOrder },
    });
    expect(reordered.body.data.map((s: any) => s.id)).toEqual(newOrder);
    expect(reordered.body.data.map((s: any) => s.order_index)).toEqual([0, 1, 2]);

    const updated = await invoke(shotListController.updateShot, {
      user,
      params: { id: String(shot3.body.data.id) },
      body: { status: "shot" },
    });
    expect(updated.body.data.status).toBe("shot");

    await invoke(shotListController.deleteShot, { user, params: { id: String(shot2.body.data.id) } });

    const afterDelete = await invoke(shotListController.getShotList, { user, params: { projectId } });
    expect(afterDelete.body.data.shots).toHaveLength(2);
    expect(afterDelete.body.data.shots.map((s: any) => s.id)).toEqual([shot3.body.data.id, shot1.body.data.id]);
  });

  it("covers timesheet timer + manual entries with single-open-timer gating (F4)", async () => {
    // timesheet entitlement is Pro+ (already satisfied — user is on studio from the budget test).
    const timesheetGate = planAccess.requireStudioPlan("timesheet");
    await invoke(timesheetGate, { user }); // should not throw

    const noRunning = await invoke(timesheetController.getRunningTimer, { user });
    expect(noRunning.body.data).toBeNull();

    const started = await invoke(timesheetController.startTimer, {
      user,
      body: { description: "Edição bruta" },
    });
    expect(started.body.data.ended_at).toBeNull();

    // Starting a second timer while one is open must be rejected with 409 (Property 6).
    await expect(
      invoke(timesheetController.startTimer, { user, body: { description: "Outro timer" } }),
    ).rejects.toMatchObject({ status: 409 });

    const stopped = await invoke(timesheetController.stopTimer, {
      user,
      params: { id: String(started.body.data.id) },
      body: { hourlyRate: 5000 },
    });
    expect(stopped.body.data.ended_at).not.toBeNull();
    expect(stopped.body.data.duration_sec).toBeGreaterThanOrEqual(0);

    // Stopping an already-closed entry must be rejected.
    await expect(
      invoke(timesheetController.stopTimer, { user, params: { id: String(started.body.data.id) }, body: {} }),
    ).rejects.toMatchObject({ status: 409 });

    // After stopping, a new timer can be started again.
    const startedAgain = await invoke(timesheetController.startTimer, { user, body: {} });
    expect(startedAgain.body.data.ended_at).toBeNull();
    await invoke(timesheetController.stopTimer, { user, params: { id: String(startedAgain.body.data.id) }, body: {} });

    // Manual entry: exactly 2 hours at R$50/h (5000 cents) => cost = 10000 cents.
    const manual = await invoke(timesheetController.addManualEntry, {
      user,
      body: {
        description: "Revisão com cliente",
        startedAt: "2026-07-01T10:00:00.000Z",
        endedAt: "2026-07-01T12:00:00.000Z",
        hourlyRate: 5000,
      },
    });
    expect(manual.body.data.duration_sec).toBe(7200);

    const listed = await invoke(timesheetController.listEntries, { user, query: {} });
    expect(listed.body.data.entries.length).toBeGreaterThanOrEqual(3);
    expect(listed.body.data.totals.totalCost).toBeGreaterThanOrEqual(10000 + 5000 * (0 / 3600)); // manual entry cost alone

    const deleted = await invoke(timesheetController.deleteEntry, { user, params: { id: String(manual.body.data.id) } });
    expect(deleted.body.success).toBe(true);

    const afterDelete = await invoke(timesheetController.listEntries, { user, query: {} });
    expect(afterDelete.body.data.entries.some((e: any) => e.id === manual.body.data.id)).toBe(false);
  });

  it("covers project schedule .ics export with deadline + meeting (F5)", async () => {
    const client = await invoke(clientsController.createClient, {
      user,
      body: { name: "Cliente Calendário", email: "calendario@example.com" },
    });
    const clientId = client.body.data.id;

    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Projeto Calendário", metadataJson: "{}" },
    });
    const projectId = project.body.data.id;

    // Link the project to the client and set a deadline directly (no dual-path
    // controller exists for this in the test's forced-SQLite environment).
    sqliteDb.prepare("UPDATE projects SET client_id = ?, deadline = ? WHERE id = ?").run(
      clientId,
      "2026-09-01",
      projectId,
    );

    // No events yet (no deadline visible via ownership check path before update lands,
    // but we already set it above) — insert a meeting for this client directly.
    sqliteDb
      .prepare(
        `INSERT INTO meetings (user_id, client_id, title, location, starts_at, duration_minutes, share_token, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .run(user.id, clientId, "Reunião de briefing", "Escritório", "2026-08-15T14:00:00.000Z", 45, `token-${Date.now()}`);

    const exported = await invoke(calendarController.exportProjectSchedule, {
      user,
      params: { projectId: String(projectId) },
    });

    expect(exported.headers["Content-Type"]).toContain("text/calendar");
    const veventCount = (exported.sent?.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(2);
    expect(exported.sent).toContain("Reunião de briefing");
    expect(exported.sent).toContain("Prazo final");
  });

  it("returns 404 when a project has no deadline or meetings to export (F5)", async () => {
    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Projeto Sem Agenda", metadataJson: "{}" },
    });

    await expect(
      invoke(calendarController.exportProjectSchedule, { user, params: { projectId: String(project.body.data.id) } }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("covers DRE by project with plan gating, revenue linking and cross-tenant isolation", async () => {
    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Projeto DRE", metadataJson: "{}" },
    });
    const projectId = String(project.body.data.id);

    // `user` is on studio plan already (upgraded by the budget test above),
    // but exercise the real gate anyway (projectDre is Studio-only, same as budgetTracking).
    const dreGate = planAccess.requireStudioPlan("projectDre");
    await invoke(dreGate, { user, params: { projectId } }); // studio already active — should not throw

    // Downgrade temporarily to confirm the gate actually blocks non-Studio plans.
    await authService.updateUserPlan(user.id, "pro");
    await expect(
      invoke(dreGate, { user, params: { projectId } }),
    ).rejects.toMatchObject({ status: 402 });
    await authService.updateUserPlan(user.id, "studio");

    // No revenue/budget linked yet -> report shows zeros with hasRevenueData/hasBudgetData false.
    const emptyReport = await invoke(dreController.getReport, { user, params: { projectId } });
    expect(emptyReport.body.data.grossRevenue).toBe(0);
    expect(emptyReport.body.data.hasRevenueData).toBe(false);

    // Configure a 10% percent deduction + a fixed allocated expense.
    const settings = await invoke(dreController.updateSettings, {
      user,
      params: { projectId },
      body: {
        deductions: [{ name: "Impostos", type: "percent", value: 1000 }], // 10%
        allocatedExpense: { mode: "fixed", value: 5000 },
      },
    });
    expect(settings.body.success).toBe(true);

    // Link settled income to the project via the extended FinancialEntry endpoint.
    await invoke(analyticsController.createFinancialEntry, {
      user,
      body: { projectId: project.body.data.id, kind: "income", description: "Receita do projeto", amount: 100000, status: "settled" },
    });

    const report = await invoke(dreController.getReport, { user, params: { projectId } });
    expect(report.body.data.hasRevenueData).toBe(true);
    expect(report.body.data.grossRevenue).toBe(100000);
    expect(report.body.data.totalDeductions).toBe(10000); // 10% of 100000
    expect(report.body.data.netRevenue).toBe(90000);
    expect(report.body.data.allocatedExpense).toBe(5000);
    expect(report.body.data.netResult).toBe(90000 - report.body.data.directCosts - 5000);

    // Cross-tenant: another user cannot read/configure this project's DRE.
    const otherUser = await authService.registerUser(
      "Outro Tenant DRE",
      `other-dre-${Date.now()}@example.com`,
      "password-123",
    );
    await authService.updateUserPlan(otherUser.id, "studio");
    await expect(
      invoke(dreController.getReport, { user: otherUser, params: { projectId } }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      invoke(dreController.updateSettings, { user: otherUser, params: { projectId }, body: { deductions: [], allocatedExpense: null } }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
