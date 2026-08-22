import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let db: typeof import("../models/db.js").db;
let sessionService: typeof import("./sessionService.js");

describe("sessionService cleanup", () => {
  const userId = 1;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-sessions-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    const dbModule = await import("../models/db.js");
    await dbModule.initDatabase();
    db = dbModule.db;
    sessionService = await import("./sessionService.js");
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
    db.prepare("DELETE FROM user_sessions").run();
    db.prepare("DELETE FROM users").run();
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(userId, "session-owner@example.com", "hash");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function insertSession(tokenHash: string, lastActiveAt: string, revokedAt: string | null = null) {
    db.prepare(
      `INSERT INTO user_sessions
        (user_id, token_hash, user_agent, device_label, ip_address, last_active_at, created_at, revoked_at)
       VALUES (?, ?, 'UA', 'Chrome no macOS', '127.0.0.1', ?, ?, ?)`,
    ).run(userId, tokenHash, lastActiveAt, lastActiveAt, revokedAt);
  }

  it("removes inactive sessions older than the retention window", async () => {
    insertSession("old-active", "2026-08-10 10:00:00", null);
    insertSession("recent-active", "2026-08-21 10:00:00", null);

    const result = await sessionService.cleanupExpiredSessions(7);

    expect(result.deleted).toBe(1);
    const remaining = db.prepare("SELECT token_hash FROM user_sessions ORDER BY token_hash").all() as Array<{ token_hash: string }>;
    expect(remaining.map((row) => row.token_hash)).toEqual(["recent-active"]);
  });

  it("keeps recently revoked sessions until the token expiry window passes", async () => {
    insertSession("recent-revoked", "2026-08-22 10:00:00", "2026-08-22 11:00:00");
    insertSession("old-revoked", "2026-08-22 10:00:00", "2026-08-10 10:00:00");

    const result = await sessionService.cleanupExpiredSessions(7);

    expect(result.deleted).toBe(1);
    const remaining = db.prepare("SELECT token_hash FROM user_sessions ORDER BY token_hash").all() as Array<{ token_hash: string }>;
    expect(remaining.map((row) => row.token_hash)).toEqual(["recent-revoked"]);
  });
});
