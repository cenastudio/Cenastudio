import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

let authService: typeof import("./authService.js");

describe("authService", () => {
  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.ADMIN_EMAILS = "owner@cenastudio.com.br";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-auth-service-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    const dbModule = await import("../models/db.js");
    dbModule.initDatabase();
    authService = await import("./authService.js");
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
});
