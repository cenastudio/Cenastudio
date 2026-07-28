import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

let clientPortalAuthService: typeof import("./clientPortalAuthService.js");
let authService: typeof import("./authService.js");
let database: typeof import("../models/db.js").db;

describe("clientPortalAuthService", () => {
  let testUserId: number;
  let testClientId: number;
  let otherUserId: number;
  let otherClientId: number;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.ADMIN_EMAILS = "owner@cenastudio.com.br";
    process.env.ADMIN_DEFAULT_PASSWORD = "admin-initial-password";
    process.env.DEMO_USER_PASSWORD = "demo-initial-password";
    process.env.DATABASE_PATH = path.join(
      mkdtempSync(path.join(tmpdir(), "cena-portal-auth-")),
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
    clientPortalAuthService = await import("./clientPortalAuthService.js");

    // Criar dois usuários e um cliente para cada
    const testUser = await authService.registerUser(
      "Portal Test User",
      `portal-test-${Date.now()}@example.com`,
      "password-123",
    );
    await authService.updateUserPlan(testUser.id, "studio"); // unlimited portal limit
    testUserId = testUser.id;

    const otherUser = await authService.registerUser(
      "Other User",
      `other-${Date.now()}@example.com`,
      "password-123",
    );
    otherUserId = otherUser.id;

    const insertClient = database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)");
    testClientId = (insertClient.run(testUserId, "Cliente Test Portal") as any).lastInsertRowid;
    otherClientId = (insertClient.run(otherUserId, "Cliente Other User") as any).lastInsertRowid;
  });

  it("creates portal access with valid email and password", async () => {
    const email = `client-${Date.now()}@example.com`;
    const access = await clientPortalAuthService.createAccess(testUserId, testClientId, email, "client-password-123");

    expect(access).toMatchObject({
      clientId: testClientId,
      userId: testUserId,
      email: email.toLowerCase(),
      active: true,
    });
    expect(access.id).toBeTruthy();
  });

  it("rejects duplicate portal access for the same client", async () => {
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Temp Client Duplicate",
    ) as any).lastInsertRowid;
    await clientPortalAuthService.createAccess(
      testUserId,
      tempClientId,
      "duplicate@example.com",
      "password-123",
    );

    await expect(
      clientPortalAuthService.createAccess(testUserId, tempClientId, "another@example.com", "password-123"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects portal access creation if email is already in use", async () => {
    const email = `shared-email-${Date.now()}@example.com`;
    const tempClient1 = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Temp Client 1",
    ) as any).lastInsertRowid;
    const tempClient2 = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Temp Client 2",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(testUserId, tempClient1, email, "password-123");
    await expect(
      clientPortalAuthService.createAccess(testUserId, tempClient2, email, "password-123"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("enforces portal access limit for Free plan (1 access max)", async () => {
    const freeUser = await authService.registerUser(
      "Free Plan User",
      `free-${Date.now()}@example.com`,
      "password-123",
    );
    await authService.updateUserPlan(freeUser.id, "free");

    const client1 = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      freeUser.id,
      "Free Client 1",
    ) as any).lastInsertRowid;
    const client2 = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      freeUser.id,
      "Free Client 2",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(freeUser.id, client1, `free-c1-${Date.now()}@example.com`, "password-123");

    await expect(
      clientPortalAuthService.createAccess(freeUser.id, client2, `free-c2-${Date.now()}@example.com`, "password-123"),
    ).rejects.toMatchObject({ status: 402 });
  });

  it("enforces portal access limit for Pro plan (5 accesses max)", async () => {
    const proUser = await authService.registerUser("Pro Plan User", `pro-${Date.now()}@example.com`, "password-123");
    await authService.updateUserPlan(proUser.id, "pro");

    const insertClient = database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)");
    const clients = [];
    for (let i = 1; i <= 6; i += 1) {
      clients.push((insertClient.run(proUser.id, `Pro Client ${i}`) as any).lastInsertRowid);
    }

    for (let i = 0; i < 5; i += 1) {
      await clientPortalAuthService.createAccess(
        proUser.id,
        clients[i],
        `pro-c${i + 1}-${Date.now()}@example.com`,
        "password-123",
      );
    }

    await expect(
      clientPortalAuthService.createAccess(proUser.id, clients[5], `pro-c6-${Date.now()}@example.com`, "password-123"),
    ).rejects.toMatchObject({ status: 402 });
  });

  it("allows unlimited portal accesses for Studio plan", async () => {
    const studioUser = await authService.registerUser(
      "Studio Plan User",
      `studio-${Date.now()}@example.com`,
      "password-123",
    );
    await authService.updateUserPlan(studioUser.id, "studio");

    const insertClient = database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)");
    for (let i = 1; i <= 10; i += 1) {
      const clientId = (insertClient.run(studioUser.id, `Studio Client ${i}`) as any).lastInsertRowid;
      await expect(
        clientPortalAuthService.createAccess(
          studioUser.id,
          clientId,
          `studio-c${i}-${Date.now()}@example.com`,
          "password-123",
        ),
      ).resolves.toMatchObject({ clientId, active: true });
    }
  });

  it("logs in with valid credentials and updates lastLoginAt", async () => {
    const email = `login-test-${Date.now()}@example.com`;
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Login Test Client",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(testUserId, tempClientId, email, "login-password-123");

    const loginResult = await clientPortalAuthService.login(email, "login-password-123");
    expect(loginResult).toMatchObject({ clientId: tempClientId, userId: testUserId });

    const status = await clientPortalAuthService.getAccessStatus(testUserId, tempClientId);
    expect(status?.lastLoginAt).toBeTruthy();
  });

  it("rejects login with incorrect password", async () => {
    const email = `wrong-pass-${Date.now()}@example.com`;
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Wrong Pass Client",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(testUserId, tempClientId, email, "correct-password");

    await expect(clientPortalAuthService.login(email, "wrong-password")).rejects.toMatchObject({ status: 401 });
  });

  it("rejects login when access is inactive", async () => {
    const email = `inactive-${Date.now()}@example.com`;
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Inactive Client",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(testUserId, tempClientId, email, "password-123");
    await clientPortalAuthService.setActive(testUserId, tempClientId, false);

    await expect(clientPortalAuthService.login(email, "password-123")).rejects.toMatchObject({ status: 401 });
  });

  it("activates and deactivates portal access", async () => {
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Active Toggle Client",
    ) as any).lastInsertRowid;
    const email = `toggle-${Date.now()}@example.com`;

    await clientPortalAuthService.createAccess(testUserId, tempClientId, email, "password-123");

    const deactivated = await clientPortalAuthService.setActive(testUserId, tempClientId, false);
    expect(deactivated.active).toBe(false);

    const reactivated = await clientPortalAuthService.setActive(testUserId, tempClientId, true);
    expect(reactivated.active).toBe(true);
  });

  it("allows client to change their own password", async () => {
    const email = `change-pass-${Date.now()}@example.com`;
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Change Pass Client",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(testUserId, tempClientId, email, "old-password");

    await clientPortalAuthService.changePassword(tempClientId, "old-password", "new-password-123");

    await expect(clientPortalAuthService.login(email, "old-password")).rejects.toMatchObject({ status: 401 });
    await expect(clientPortalAuthService.login(email, "new-password-123")).resolves.toMatchObject({
      clientId: tempClientId,
    });
  });

  it("rejects password change with incorrect current password", async () => {
    const email = `wrong-current-${Date.now()}@example.com`;
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Wrong Current Client",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(testUserId, tempClientId, email, "correct-password");

    await expect(
      clientPortalAuthService.changePassword(tempClientId, "wrong-password", "new-password"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("allows producer to reset client password", async () => {
    const email = `reset-${Date.now()}@example.com`;
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Reset Client",
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(testUserId, tempClientId, email, "old-password");

    await clientPortalAuthService.resetPassword(testUserId, tempClientId, "admin-reset-password");

    await expect(clientPortalAuthService.login(email, "old-password")).rejects.toMatchObject({ status: 401 });
    await expect(clientPortalAuthService.login(email, "admin-reset-password")).resolves.toMatchObject({
      clientId: tempClientId,
    });
  });

  it("enforces ownership isolation — user cannot manage other user's client portal", async () => {
    // Criar um cliente completamente novo para garantir isolamento
    const email = `isolation-${Date.now()}@example.com`;
    const isolationClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      `Isolation Test Client ${Date.now()}`,
    ) as any).lastInsertRowid;

    await clientPortalAuthService.createAccess(testUserId, isolationClientId, email, "password-123");

    await expect(clientPortalAuthService.getAccessStatus(otherUserId, isolationClientId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(clientPortalAuthService.setActive(otherUserId, isolationClientId, false)).rejects.toMatchObject({
      status: 404,
    });
    await expect(clientPortalAuthService.resetPassword(otherUserId, isolationClientId, "new-pass")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("returns null status when portal access was never created", async () => {
    const neverCreatedClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Never Created Client",
    ) as any).lastInsertRowid;

    const status = await clientPortalAuthService.getAccessStatus(testUserId, neverCreatedClientId);
    expect(status).toBeNull();
  });

  it("rejects invalid email formats", async () => {
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Invalid Email Client",
    ) as any).lastInsertRowid;

    await expect(
      clientPortalAuthService.createAccess(testUserId, tempClientId, "not-an-email", "password-123"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects passwords shorter than 6 characters", async () => {
    const tempClientId = (database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)").run(
      testUserId,
      "Short Pass Client",
    ) as any).lastInsertRowid;

    await expect(
      clientPortalAuthService.createAccess(testUserId, tempClientId, "test@example.com", "12345"),
    ).rejects.toMatchObject({ status: 400 });
  });
});
