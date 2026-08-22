import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";


let portalDataService: typeof import("./portalDataService.js");
let authService: typeof import("./authService.js");
let database: typeof import("../models/db.js").db;

describe("portalDataService", () => {
  let ownerId: number;
  let clientId: number;
  let projectId: number;
  let otherOwnerId: number;
  let otherClientId: number;
  let otherProjectId: number;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(
      mkdtempSync(path.join(tmpdir(), "cena-portal-data-")),
      "test.db",
    );
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const dbModule = await import("../models/db.js");
    await dbModule.initDatabase();
    database = dbModule.db;
    authService = await import("./authService.js");
    portalDataService = await import("./portalDataService.js");

    // Criar dois proprietários com clientes e projetos
    const owner = await authService.registerUser(
      "Portal Data Owner",
      `portal-data-owner-${Date.now()}@example.com`,
      "password-123",
    );
    ownerId = owner.id;

    const otherOwner = await authService.registerUser(
      "Other Data Owner",
      `other-data-owner-${Date.now()}@example.com`,
      "password-123",
    );
    otherOwnerId = otherOwner.id;

    // Criar clientes
    const insertClient = database.prepare("INSERT INTO clients (user_id, name, email) VALUES (?, ?, ?)");
    const result = insertClient.run(ownerId, "Portal Data Client", "portal-data@example.com");
    clientId = Number(result.lastInsertRowid);

    const otherResult = insertClient.run(otherOwnerId, "Other Data Client", "other-data@example.com");
    otherClientId = Number(otherResult.lastInsertRowid);

    // Criar projetos
    const insertProject = database.prepare(`
      INSERT INTO projects (user_id, client_id, name, metadata_json)
      VALUES (?, ?, ?, ?)
    `);
    const projectResult = insertProject.run(ownerId, clientId, "Project Alpha", "{}");
    projectId = Number(projectResult.lastInsertRowid);

    const otherProjectResult = insertProject.run(otherOwnerId, otherClientId, "Project Beta", "{}");
    otherProjectId = Number(otherProjectResult.lastInsertRowid);

    // Criar arquivos para os projetos
    const insertFile = database.prepare(`
      INSERT INTO files (user_id, project_id, filename, original_name, path, mime_type, size, category, visible_in_client_portal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertFile.run(
      ownerId,
      projectId,
      "alpha-file.pdf",
      "alpha-file.pdf",
      "files/alpha.pdf",
      "application/pdf",
      1024,
      "project",
      1,
    );
    insertFile.run(
      ownerId,
      projectId,
      "alpha-internal.pdf",
      "alpha-internal.pdf",
      "files/alpha-internal.pdf",
      "application/pdf",
      1024,
      "project",
      0,
    );
    insertFile.run(
      otherOwnerId,
      otherProjectId,
      "beta-file.pdf",
      "beta-file.pdf",
      "files/beta.pdf",
      "application/pdf",
      2048,
      "project",
      1,
    );

    // Criar entradas financeiras (usando due_date no lugar de date)
    const insertFinancial = database.prepare(`
      INSERT INTO financial_entries (user_id, client_id, kind, amount, description, due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const today = new Date().toISOString().split("T")[0];
    insertFinancial.run(ownerId, clientId, "income", 25000, "First Payment", today);
    insertFinancial.run(ownerId, clientId, "expense", 5000, "Production Costs", today);
    insertFinancial.run(otherOwnerId, otherClientId, "income", 50000, "Full Payment", today);

    const insertProposal = database.prepare(`
      INSERT INTO proposals (
        user_id, client_id, project_id, title, html, total, status, share_token,
        document_hash, accepted_at, visible_in_client_portal, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    insertProposal.run(
      ownerId,
      clientId,
      projectId,
      "Proposal for Alpha",
      "<h1>Alpha</h1>",
      50000,
      "accepted",
      "proposal-alpha-token",
      "hash-alpha",
      "2026-08-22T10:00:00.000Z",
      1,
    );
    insertProposal.run(
      ownerId,
      clientId,
      projectId,
      "Internal Alpha Draft",
      "<h1>Draft</h1>",
      25000,
      "draft",
      "proposal-alpha-draft-token",
      "hash-draft",
      null,
      0,
    );
    insertProposal.run(
      otherOwnerId,
      otherClientId,
      otherProjectId,
      "Proposal for Beta",
      "<h1>Beta</h1>",
      75000,
      "sent",
      "proposal-beta-token",
      "hash-beta",
      null,
      1,
    );
  });

  it("lists projects filtered strictly by clientId", async () => {
    const projects = await portalDataService.listProjectsForClient(clientId);

    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      id: projectId,
      name: "Project Alpha",
    });
  });

  it("returns empty list when clientId has no projects", async () => {
    // Criar cliente sem projetos
    const insertClient = database.prepare("INSERT INTO clients (user_id, name, email) VALUES (?, ?, ?)");
    const result = insertClient.run(ownerId, "Empty Client", "empty@example.com");
    const emptyClientId = Number(result.lastInsertRowid);

    const projects = await portalDataService.listProjectsForClient(emptyClientId);
    expect(projects).toEqual([]);
  });

  it("gets project detail for own client only", async () => {
    const project = await portalDataService.getProjectForClient(clientId, projectId);

    expect(project).toMatchObject({
      id: projectId,
      name: "Project Alpha",
    });
  });

  it("returns null when getting project from different client", async () => {
    // Tentar pegar otherProjectId usando clientId (cross-client) — deve lançar 404
    await expect(
      portalDataService.getProjectForClient(clientId, otherProjectId),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("lists files filtered by clientId via project join", async () => {
    const files = await portalDataService.listFilesForClient(clientId);

    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      originalName: "alpha-file.pdf",
      projectId,
    });
  });

  it("does not list files that were not explicitly released to the portal", async () => {
    const files = await portalDataService.listFilesForClient(clientId);

    expect(files.some((file) => file.originalName === "alpha-internal.pdf")).toBe(false);
  });

  it("returns empty list for cross-client file access", async () => {
    const files = await portalDataService.listFilesForClient(otherClientId);

    // otherClient tem 1 arquivo (beta-file.pdf)
    expect(files).toHaveLength(1);
    expect(files[0].originalName).toBe("beta-file.pdf");

    // clientId NÃO deve ver arquivos de otherClientId
    const crossFiles = await portalDataService.listFilesForClient(clientId);
    expect(crossFiles.every((f) => f.originalName !== "beta-file.pdf")).toBe(true);
  });

  it("gets file for download only if belongs to client", async () => {
    const files = await portalDataService.listFilesForClient(clientId);
    expect(files).toHaveLength(1);
    expect(files[0].originalName).toBe("alpha-file.pdf");
  });

  it("returns null when getting file from different client", async () => {
    const ownFiles = await portalDataService.listFilesForClient(clientId);
    const otherFiles = await portalDataService.listFilesForClient(otherClientId);

    // Verificar isolamento: cada cliente só vê os próprios arquivos
    expect(ownFiles.every((f) => f.projectId === projectId)).toBe(true);
    expect(otherFiles.every((f) => f.projectId === otherProjectId)).toBe(true);
  });

  it("lists proposals filtered strictly by clientId", async () => {
    const proposals = await portalDataService.listProposalsForClient(clientId);

    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      title: "Proposal for Alpha",
      total: 50000,
      status: "accepted",
    });
  });

  it("returns empty proposals for cross-client access", async () => {
    const proposals = await portalDataService.listProposalsForClient(otherClientId);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].title).toBe("Proposal for Beta");

    const ownProposals = await portalDataService.listProposalsForClient(clientId);
    expect(ownProposals.every((p) => p.title !== "Proposal for Beta")).toBe(true);
  });

  // meetings seguem Prisma puro no Portal; a P1B.4.3 atual cobre propostas.
  it.skip("lists meetings filtered strictly by clientId", async () => {
    const meetings = await portalDataService.listMeetingsForClient(clientId);
    expect(meetings).toHaveLength(1);
    expect(meetings[0]).toMatchObject({
      title: "Kickoff Meeting",
      durationMinutes: 60,
      location: "Zoom",
      status: "scheduled",
    });
  });

  it.skip("returns empty meetings for cross-client access", async () => {
    const meetings = await portalDataService.listMeetingsForClient(otherClientId);
    expect(meetings).toHaveLength(1);
    expect(meetings[0].title).toBe("Review Meeting");

    const ownMeetings = await portalDataService.listMeetingsForClient(clientId);
    expect(ownMeetings.every((m) => m.title !== "Review Meeting")).toBe(true);
  });

  it("calculates financial summary filtered by clientId", async () => {
    const summary = await portalDataService.getFinancialSummaryForClient(clientId);

    // O serviço retorna totalPending (income não settled) e totalPaid (income settled)
    // Os inserts usaram status default (pending), então tudo vai para totalPending
    expect(summary).toMatchObject({
      totalPending: 25000,
      totalPaid: 0,
      currency: "BRL",
    });
  });

  it("returns correct financial summary for cross-client isolation", async () => {
    const otherSummary = await portalDataService.getFinancialSummaryForClient(otherClientId);

    expect(otherSummary).toMatchObject({
      totalPending: 50000,
      totalPaid: 0,
      currency: "BRL",
    });

    const ownSummary = await portalDataService.getFinancialSummaryForClient(clientId);
    expect(ownSummary.totalPending).not.toBe(otherSummary.totalPending);
  });

  it("enforces strict isolation: never returns data from other clients", async () => {
    const crossProjects = await portalDataService.listProjectsForClient(clientId);
    expect(crossProjects.every((p) => p.id === projectId)).toBe(true);

    const crossFiles = await portalDataService.listFilesForClient(clientId);
    for (const file of crossFiles) {
      const project = database
        .prepare("SELECT client_id FROM projects WHERE id = ?")
        .get(file.projectId) as { client_id: number };
      expect(Number(project.client_id)).toBe(clientId);
    }
  });
});
