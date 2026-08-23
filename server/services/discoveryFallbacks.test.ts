import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

let authService: typeof import("./authService.js");
let shotTypeService: typeof import("./shotTypeService.js");
let portalDataService: typeof import("./portalDataService.js");
let storageService: typeof import("./storageService.js");
let database: typeof import("../models/db.js").db;

describe("local discovery audit fallbacks", () => {
  let ownerId: number;
  let clientId: number;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-discovery-fallbacks-")), "test.db");
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
    shotTypeService = await import("./shotTypeService.js");
    portalDataService = await import("./portalDataService.js");
    storageService = await import("./storageService.js");

    const owner = await authService.registerUser(
      "Discovery Owner",
      `discovery-owner-${Date.now()}@example.com`,
      "password-123",
    );
    ownerId = owner.id;
    const clientResult = database
      .prepare("INSERT INTO clients (user_id, name, email) VALUES (?, ?, ?)")
      .run(ownerId, "Discovery Client", "discovery-client@example.com");
    clientId = Number(clientResult.lastInsertRowid);
  });

  it("initializes default shot types in SQLite without 500", async () => {
    await shotTypeService.ensureDefaultShotTypes(ownerId);

    const types = await shotTypeService.listShotTypes(ownerId);
    expect(types.map((type) => type.name)).toEqual([
      "Close",
      "Contra-plongée",
      "Detalhe",
      "Médio",
      "Plongée",
      "Wide",
    ]);
  });

  it("lists portal meetings through SQLite fallback", async () => {
    database
      .prepare(
        `INSERT INTO meetings (
          user_id, client_id, title, location, starts_at, duration_minutes,
          share_token, status, visible_in_client_portal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(ownerId, clientId, "Kickoff", "Meet", "2026-08-23T10:00:00.000Z", 45, "meeting-token", "scheduled", 1);

    const meetings = await portalDataService.listMeetingsForClient(clientId);
    expect(meetings).toEqual([
      expect.objectContaining({
        title: "Kickoff",
        location: "Meet",
        durationMinutes: 45,
        status: "scheduled",
      }),
    ]);
  });

  it("calculates storage stats through SQLite fallback", async () => {
    database
      .prepare(
        `INSERT INTO files (user_id, filename, original_name, path, mime_type, size, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(ownerId, "brief.pdf", "brief.pdf", "files/brief.pdf", "application/pdf", 1200, "project");

    const stats = await storageService.calculateStorageStats(ownerId);
    expect(stats).toMatchObject({
      totalUsed: 1200,
      fileCount: 1,
      byType: expect.objectContaining({ documents: 1200 }),
      topFiles: [expect.objectContaining({ name: "brief.pdf", size: 1200 })],
    });
  });
});

