import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

let authService: typeof import("./authService.js");
let lgpdService: typeof import("./lgpdService.js");
let dbModule: typeof import("../models/db.js");

describe("lgpdService.exportUserData", () => {
  let userId: number;
  let email: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-lgpd-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    dbModule = await import("../models/db.js");
    dbModule.initDatabase();
    authService = await import("./authService.js");
    lgpdService = await import("./lgpdService.js");

    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    email = `titular-${stamp}@example.com`;
    const user = await authService.registerUser("Titular LGPD", email, "password-123");
    userId = user.id;

    dbModule.db
      .prepare("INSERT INTO clients (user_id, name, email) VALUES (?, ?, ?)")
      .run(userId, "Cliente Exemplo", "cliente@example.com");
  });

  it("returns a structured export with the owner's real data", async () => {
    const data = await lgpdService.exportUserData(userId);

    expect(data.meta.userId).toBe(userId);
    expect(data.meta.format).toBe("cenastudio-data-export-v1");
    expect(data.profile).not.toBeNull();
    expect((data.profile as Record<string, unknown>).email).toBe(email);

    const clients = data.clients as Array<{ name: string }>;
    expect(clients.some((c) => c.name === "Cliente Exemplo")).toBe(true);
  });

  it("never leaks credentials or security secrets", async () => {
    const data = await lgpdService.exportUserData(userId);
    const profile = data.profile as Record<string, unknown>;

    expect(profile).toBeDefined();
    for (const forbidden of ["password_hash", "passwordHash", "two_factor_secret", "twoFactorSecret", "backup_codes", "supabase_id"]) {
      expect(profile[forbidden]).toBeUndefined();
    }

    // Full serialized payload must not contain the hashed password value.
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("password_hash");
  });

  it("isolates the export to the requesting user", async () => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const other = await authService.registerUser("Outro", `outro-${stamp}@example.com`, "password-123");
    dbModule.db
      .prepare("INSERT INTO clients (user_id, name, email) VALUES (?, ?, ?)")
      .run(other.id, "Cliente do Outro", "outro-cliente@example.com");

    const data = await lgpdService.exportUserData(userId);
    const clients = data.clients as Array<{ name: string }>;
    expect(clients.some((c) => c.name === "Cliente do Outro")).toBe(false);
  });
});
