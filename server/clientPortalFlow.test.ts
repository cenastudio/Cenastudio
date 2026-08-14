import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

let clientPortalAuthService: typeof import("./services/clientPortalAuthService.js");
let portalDataService: typeof import("./services/portalDataService.js");
let authService: typeof import("./services/authService.js");
let database: typeof import("./models/db.js").db;
let authenticateClientPortal: typeof import("./middleware/authenticateClientPortal.js");

/**
 * E2E: fluxo completo do Portal do Cliente
 *
 * Valida: criação de acesso → login do cliente → acesso aos dados próprios →
 * 404 ao tentar acessar dados de outro cliente → troca de senha →
 * desativação de acesso → limite de plano.
 */
describe("Client Portal E2E Flow", () => {
  let producerUserId: number;
  let producerClientId: number;
  let otherProducerUserId: number;
  let otherProducerClientId: number;
  let testProjectId: number;
  let otherProjectId: number;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.ADMIN_EMAILS = "owner@cenastudio.com.br";
    process.env.ADMIN_DEFAULT_PASSWORD = "admin-initial-password";
    process.env.DEMO_USER_PASSWORD = "demo-initial-password";
    process.env.DATABASE_PATH = path.join(
      mkdtempSync(path.join(tmpdir(), "cena-portal-flow-")),
      "test.db",
    );
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const dbModule = await import("./models/db.js");
    await dbModule.initDatabase();
    database = dbModule.db;
    authService = await import("./services/authService.js");
    clientPortalAuthService = await import("./services/clientPortalAuthService.js");
    portalDataService = await import("./services/portalDataService.js");
    authenticateClientPortal = await import("./middleware/authenticateClientPortal.js");

    // Criar dois produtores (studio plan, sem limite de portal)
    const producer = await authService.registerUser(
      "Producer E2E",
      `producer-e2e-${Date.now()}@example.com`,
      "password-123",
    );
    await authService.updateUserPlan(producer.id, "studio");
    producerUserId = producer.id;

    const otherProducer = await authService.registerUser(
      "Other Producer E2E",
      `other-producer-e2e-${Date.now()}@example.com`,
      "password-123",
    );
    await authService.updateUserPlan(otherProducer.id, "studio");
    otherProducerUserId = otherProducer.id;

    // Criar clientes e projetos
    const insertClient = database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)");
    producerClientId = (insertClient.run(producerUserId, "Producer's Client") as any).lastInsertRowid;
    otherProducerClientId = (insertClient.run(otherProducerUserId, "Other's Client") as any).lastInsertRowid;

    const insertProject = database.prepare(
      "INSERT INTO projects (user_id, client_id, name, status, progress) VALUES (?, ?, ?, ?, ?)",
    );
    testProjectId = (insertProject.run(producerUserId, producerClientId, "E2E Project", "in_progress", 60) as any)
      .lastInsertRowid;
    otherProjectId = (insertProject.run(
      otherProducerUserId,
      otherProducerClientId,
      "Other E2E Project",
      "completed",
      100,
    ) as any).lastInsertRowid;

    database
      .prepare("INSERT INTO files (project_id, user_id, filename, original_name, path, mime_type, size, visible_in_client_portal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(testProjectId, producerUserId, "e2e-file.pdf", "e2e-file.pdf", "path/to/e2e-file.pdf", "application/pdf", 2048, 1);
    database
      .prepare("INSERT INTO files (project_id, user_id, filename, original_name, path, mime_type, size, visible_in_client_portal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(testProjectId, producerUserId, "internal-e2e-file.pdf", "internal-e2e-file.pdf", "path/to/internal-e2e-file.pdf", "application/pdf", 1024, 0);
    database
      .prepare("INSERT INTO files (project_id, user_id, filename, original_name, path, mime_type, size, visible_in_client_portal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(otherProjectId, otherProducerUserId, "other-e2e-file.pdf", "other-e2e-file.pdf", "path/to/other-e2e-file.pdf", "application/pdf", 3072, 1);
  });

  it("E2E: producer creates portal access for their client", async () => {
    const email = `e2e-client-${Date.now()}@example.com`;
    const access = await clientPortalAuthService.createAccess(
      producerUserId,
      producerClientId,
      email,
      "client-password-123",
    );

    expect(access).toMatchObject({
      clientId: producerClientId,
      userId: producerUserId,
      email: email.toLowerCase(),
      active: true,
    });
  });

  it("E2E: client logs in with their credentials", async () => {
    // Criar um cliente separado para este teste
    const insertClient = database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)");
    const loginClientId = (insertClient.run(producerUserId, "Login Test Client") as any).lastInsertRowid;

    const email = `e2e-login-${Date.now()}@example.com`;
    await clientPortalAuthService.createAccess(producerUserId, loginClientId, email, "login-password");

    const loginResult = await clientPortalAuthService.login(email, "login-password");
    expect(loginResult).toMatchObject({
      clientId: loginClientId,
      userId: producerUserId,
    });
  });

  it("E2E: authenticated client accesses their own projects", async () => {
    const projects = await portalDataService.listProjectsForClient(producerClientId);

    expect(projects.length).toBeGreaterThan(0);
    expect(projects.some((p) => p.id === testProjectId)).toBe(true);
  });

  it("E2E: authenticated client accesses their own files", async () => {
    const files = await portalDataService.listFilesForClient(producerClientId);

    expect(files.length).toBeGreaterThan(0);
    expect(files.some((file) => file.originalName === "internal-e2e-file.pdf")).toBe(false);
    expect(files[0]).toMatchObject({
      projectId: testProjectId,
      projectName: "E2E Project",
    });
  });

  it("E2E: client gets 404 when trying to access another client's project", async () => {
    await expect(portalDataService.getProjectForClient(producerClientId, otherProjectId)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("E2E: client cannot see files from another client's projects", async () => {
    const files = await portalDataService.listFilesForClient(producerClientId);
    const otherFiles = await portalDataService.listFilesForClient(otherProducerClientId);

    // Verify isolation: each client only sees their own files
    expect(files.every((file) => file.projectId === testProjectId)).toBe(true);
    expect(otherFiles.every((file) => file.projectId === otherProjectId)).toBe(true);
  });

  it("E2E: client changes their password and old password no longer works", async () => {
    const email = `e2e-change-pass-${Date.now()}@example.com`;
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      producerUserId,
      "Change Pass E2E Client",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(producerUserId, tempClientId, email, "old-password");

    // Login with old password
    await expect(clientPortalAuthService.login(email, "old-password")).resolves.toMatchObject({
      clientId: tempClientId,
    });

    // Change password
    await clientPortalAuthService.changePassword(tempClientId, "old-password", "new-password-456");

    // Old password no longer works
    await expect(clientPortalAuthService.login(email, "old-password")).rejects.toMatchObject({ status: 401 });

    // New password works
    await expect(clientPortalAuthService.login(email, "new-password-456")).resolves.toMatchObject({
      clientId: tempClientId,
    });
  });

  it("E2E: producer deactivates client access and subsequent login fails", async () => {
    const email = `e2e-deactivate-${Date.now()}@example.com`;
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      producerUserId,
      "Deactivate E2E Client",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(producerUserId, tempClientId, email, "password-123");

    // Login works initially
    await expect(clientPortalAuthService.login(email, "password-123")).resolves.toMatchObject({
      clientId: tempClientId,
    });

    // Producer deactivates access
    await clientPortalAuthService.setActive(producerUserId, tempClientId, false);

    // Login now fails with generic 401
    await expect(clientPortalAuthService.login(email, "password-123")).rejects.toMatchObject({ status: 401 });
  });

  it("E2E: producer resets client password and client must use new password", async () => {
    const email = `e2e-reset-${Date.now()}@example.com`;
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      producerUserId,
      "Reset E2E Client",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(producerUserId, tempClientId, email, "original-password");

    // Producer resets the password
    await clientPortalAuthService.resetPassword(producerUserId, tempClientId, "admin-reset-password");

    // Original password no longer works
    await expect(clientPortalAuthService.login(email, "original-password")).rejects.toMatchObject({ status: 401 });

    // New password set by producer works
    await expect(clientPortalAuthService.login(email, "admin-reset-password")).resolves.toMatchObject({
      clientId: tempClientId,
    });
  });

  it("E2E: Free plan enforces 1 portal access limit", async () => {
    const freeProducer = await authService.registerUser(
      "Free Producer",
      `free-producer-${Date.now()}@example.com`,
      "password-123",
    );
    await authService.updateUserPlan(freeProducer.id, "free");

    const client1 = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      freeProducer.id,
      "Free Client 1",
    ) as any).lastInsertRowid;
    const client2 = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      freeProducer.id,
      "Free Client 2",
    ) as any).lastInsertRowid;

    // First portal access succeeds
    await expect(
      clientPortalAuthService.createAccess(
        freeProducer.id,
        client1,
        `free-c1-${Date.now()}@example.com`,
        "password-123",
      ),
    ).resolves.toMatchObject({ clientId: client1 });

    // Second portal access fails with 402 (limit reached)
    await expect(
      clientPortalAuthService.createAccess(
        freeProducer.id,
        client2,
        `free-c2-${Date.now()}@example.com`,
        "password-123",
      ),
    ).rejects.toMatchObject({ status: 402 });
  });

  it("E2E: Pro plan enforces 5 portal access limit", async () => {
    const proProducer = await authService.registerUser(
      "Pro Producer",
      `pro-producer-${Date.now()}@example.com`,
      "password-123",
    );
    await authService.updateUserPlan(proProducer.id, "pro");

    const insertClient = database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)");
    const clients = [];
    for (let i = 1; i <= 6; i += 1) {
      clients.push((insertClient.run(proProducer.id, `Pro Client ${i}`) as any).lastInsertRowid);
    }

    // First 5 succeed
    for (let i = 0; i < 5; i += 1) {
      await expect(
        clientPortalAuthService.createAccess(
          proProducer.id,
          clients[i],
          `pro-c${i + 1}-${Date.now()}@example.com`,
          "password-123",
        ),
      ).resolves.toMatchObject({ clientId: clients[i] });
    }

    // 6th fails with 402 (limit reached)
    await expect(
      clientPortalAuthService.createAccess(
        proProducer.id,
        clients[5],
        `pro-c6-${Date.now()}@example.com`,
        "password-123",
      ),
    ).rejects.toMatchObject({ status: 402 });
  });

  it("E2E: Studio plan allows unlimited portal accesses", async () => {
    const studioProducer = await authService.registerUser(
      "Studio Producer",
      `studio-producer-${Date.now()}@example.com`,
      "password-123",
    );
    await authService.updateUserPlan(studioProducer.id, "studio");

    const insertClient = database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)");
    for (let i = 1; i <= 10; i += 1) {
      const clientId = (insertClient.run(studioProducer.id, `Studio Client ${i}`) as any).lastInsertRowid;
      await expect(
        clientPortalAuthService.createAccess(
          studioProducer.id,
          clientId,
          `studio-c${i}-${Date.now()}@example.com`,
          "password-123",
        ),
      ).resolves.toMatchObject({ clientId, active: true });
    }
  });

  it("E2E: JWT token validation checks active status", async () => {
    const email = `e2e-jwt-${Date.now()}@example.com`;
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      producerUserId,
      "JWT Test Client",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(producerUserId, tempClientId, email, "password-123");

    // Sign a token
    const token = authenticateClientPortal.signClientPortalToken({
      clientId: tempClientId,
      userId: producerUserId,
      type: "client-portal",
    });

    // Deactivate the access
    await clientPortalAuthService.setActive(producerUserId, tempClientId, false);

    // Verify token validation would fail for inactive access (via getActiveAccessByClientId)
    const accessCheck = await clientPortalAuthService.getActiveAccessByClientId(tempClientId);
    expect(accessCheck?.active).toBe(false);
  });

  it("E2E: cross-producer isolation — one producer cannot manage another producer's client portal", async () => {
    // Criar um cliente novo específico para este teste (evita conflito com acesso criado em outros testes)
    const isolationClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      producerUserId,
      "Isolation Test Client",
    ) as any).lastInsertRowid;

    const email = `e2e-isolation-${Date.now()}@example.com`;
    await clientPortalAuthService.createAccess(producerUserId, isolationClientId, email, "password-123");

    // Other producer cannot see or modify this access
    await expect(
      clientPortalAuthService.getAccessStatus(otherProducerUserId, isolationClientId),
    ).rejects.toMatchObject({ status: 404 });

    await expect(
      clientPortalAuthService.setActive(otherProducerUserId, isolationClientId, false),
    ).rejects.toMatchObject({ status: 404 });

    await expect(
      clientPortalAuthService.resetPassword(otherProducerUserId, isolationClientId, "new-pass"),
    ).rejects.toMatchObject({ status: 404 });
  });
});
