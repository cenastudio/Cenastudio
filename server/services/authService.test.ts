import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

let authService: typeof import("./authService.js");
let workspaceService: typeof import("./workspaceService.js");
let initDatabase: typeof import("../models/db.js").initDatabase;
let database: typeof import("../models/db.js").db;
let entitlementService: typeof import("./entitlementService.js");

describe("authService", () => {
  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.ADMIN_EMAILS = "owner@cenastudio.com.br";
    process.env.ADMIN_DEFAULT_PASSWORD = "admin-initial-password";
    process.env.DEMO_USER_PASSWORD = "demo-initial-password";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-auth-service-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const dbModule = await import("../models/db.js");
    await dbModule.initDatabase();
    initDatabase = dbModule.initDatabase;
    database = dbModule.db;
    authService = await import("./authService.js");
    workspaceService = await import("./workspaceService.js");
    entitlementService = await import("./entitlementService.js");
  });

  it("detects configured admin emails case-insensitively", () => {
    expect(authService.isAdminEmail(" OWNER@CENASTUDIO.COM.BR ")).toBe(true);
    expect(authService.isAdminEmail("guest@cenastudio.com.br")).toBe(false);
  });

  it("registers users, creates trial plan and rejects duplicates", async () => {
    const email = `auth-${Date.now()}@example.com`;
    const user = await authService.registerUser("Auth Test", email, "password-123");

    expect(user.email).toBe(email);
    expect(user.role).toBe("user");

    const plan = authService.formatUserPlan(await authService.getUserPlan(user.id));
    expect(plan).toMatchObject({ planId: "pro", status: "trial" });
    await expect(workspaceService.listWorkspacesForUser(user.id)).resolves.toEqual([
      expect.objectContaining({ name: "Auth Test", type: "solo", role: "owner", status: "active" }),
    ]);

    await expect(authService.registerUser("Auth Test", email, "password-123"))
      .rejects.toMatchObject({ status: 409 });
  });

  it("logs in with valid credentials and rejects invalid credentials", async () => {
    const email = `login-${Date.now()}@example.com`;
    const created = await authService.registerUser("Login Test", email, "password-123");

    const logged = await authService.loginUser(email.toUpperCase(), "password-123");
    expect(logged).toMatchObject({ id: created.id, email });

    await expect(authService.loginUser(email, "wrong-password"))
      .rejects.toMatchObject({ status: 401 });
  });

  it("creates admin-managed operational access when Supabase Auth Admin is unavailable", async () => {
    const email = `managed-${Date.now()}@example.com`;
    const user = await authService.createManagedUser({
      name: "Managed User",
      email,
      password: "password-123",
      role: "user",
      planId: "studio",
    });

    expect(user).toMatchObject({ email, role: "user", planId: "studio" });
    await expect(authService.loginUser(email, "password-123")).resolves.toMatchObject({ email });
    const plan = authService.formatUserPlan(await authService.getUserPlan(user.id));
    expect(plan).toMatchObject({ planId: "studio", status: "active" });
  });

  it("creates reset tokens and resets password once", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const email = `reset-${Date.now()}@example.com`;
    await authService.registerUser("Reset Test", email, "password-123");

    const token = await authService.createResetToken(email);
    expect(token).toBeTruthy();

    await authService.resetPassword(token!, "new-password-123");
    await expect(authService.loginUser(email, "password-123")).rejects.toMatchObject({ status: 401 });
    await expect(authService.loginUser(email, "new-password-123")).resolves.toMatchObject({ email });
    await expect(authService.resetPassword(token!, "another-password-123")).rejects.toMatchObject({ status: 400 });
    consoleSpy.mockRestore();
  });

  it("reconciles configured admin and demo passwords for existing seed accounts", async () => {
    process.env.ADMIN_DEFAULT_PASSWORD = "admin-rotated-password";
    process.env.DEMO_USER_PASSWORD = "demo-rotated-password";
    // initDatabase is async — awaiting it is required so the password
    // reconciliation below actually completes before we try to log in.
    await initDatabase();

    await expect(
      authService.loginUser("admin@cenastudio.com.br", "admin-rotated-password"),
    ).resolves.toMatchObject({ role: "admin" });
    await expect(
      authService.loginUser("demo@cenastudio.com.br", "demo-rotated-password"),
    ).resolves.toMatchObject({ role: "user" });
  });

  it("keeps a new Studio account pending until payment activates it", async () => {
    const email = `studio-pending-${Date.now()}@example.com`;
    const user = await authService.registerUser("Pending Studio", email, "password-123", "studio");
    const plan = authService.formatUserPlan(await authService.getUserPlan(user.id));

    expect(plan).toMatchObject({ planId: "studio", status: "pending" });
    await expect(entitlementService.requireOperationalAccess(user.id, user.role)).rejects.toMatchObject({
      status: 402,
    });
  });

  it("enforces the five-client allowance for Free accounts", async () => {
    const email = `free-limit-${Date.now()}@example.com`;
    const user = await authService.registerUser("Free Limit", email, "password-123");
    await authService.updateUserPlan(user.id, "free");

    const insert = database.prepare("INSERT INTO clients (user_id, name) VALUES (?, ?)");
    for (let index = 1; index <= 5; index += 1) insert.run(user.id, `Cliente ${index}`);

    await expect(entitlementService.getClientAllowance(user.id)).resolves.toMatchObject({
      planId: "free",
      used: 5,
      limit: 5,
      remaining: 0,
      canCreate: false,
    });
    await expect(entitlementService.assertClientCapacity(user.id, user.role)).rejects.toMatchObject({
      status: 402,
    });
  });
});
