import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

let authService: typeof import("./authService.js");
let lgpdService: typeof import("./lgpdService.js");
let dbModule: typeof import("../models/db.js");

describe("lgpdService.anonymizeUser", () => {
  let userId: number;
  let clientId: number;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-anon-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.STRIPE_SECRET_KEY;

    dbModule = await import("../models/db.js");
    dbModule.initDatabase();
    authService = await import("./authService.js");
    lgpdService = await import("./lgpdService.js");

    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await authService.registerUser("Fulano Real", `fulano-${stamp}@example.com`, "password-123");
    userId = user.id;

    const client = dbModule.db
      .prepare("INSERT INTO clients (user_id, name, email, phone) VALUES (?, ?, ?, ?)")
      .run(userId, "Cliente Sensível", "contato@cliente.com", "+55 11 99999-9999");
    clientId = Number(client.lastInsertRowid);

    dbModule.db
      .prepare("INSERT INTO files (user_id, filename, original_name, path) VALUES (?, ?, ?, ?)")
      .run(userId, "doc.pdf", "documento-pessoal.pdf", `${userId}/1/doc.pdf`);
  });

  it("irreversibly anonymizes the user's personal data and credentials", async () => {
    await lgpdService.anonymizeUser(userId);

    const user = dbModule.db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as Record<string, unknown>;
    expect(user.email).toBe(`deleted-user-${userId}@anonymized.invalid`);
    expect(user.name).toBe("Usuário removido");
    expect(user.phone).toBeNull();
    expect(user.disabled).toBe(1);
    expect(String(user.password_hash)).toMatch(/^anonymized-/);
    expect(user.two_factor_secret).toBeNull();
  });

  it("scrubs client PII and deletes personal files", async () => {
    const client = dbModule.db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId) as Record<string, unknown>;
    expect(client.name).toBe("Cliente removido");
    expect(client.email).toBeNull();
    expect(client.phone).toBeNull();

    const files = dbModule.db.prepare("SELECT COUNT(*) AS c FROM files WHERE user_id = ?").get(userId) as { c: number };
    expect(files.c).toBe(0);
  });

  it("cannot log in with the original password after anonymization", async () => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const victim = await authService.registerUser("Vitima", `vitima-${stamp}@example.com`, "password-123");
    const originalEmail = `vitima-${stamp}@example.com`;

    await lgpdService.anonymizeUser(victim.id);

    await expect(authService.loginUser(originalEmail, "password-123")).rejects.toBeTruthy();
  });
});
