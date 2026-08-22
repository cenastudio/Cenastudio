import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let db: typeof import("../models/db.js").db;
let webhookService: typeof import("./webhookService.js");

describe("webhookService retry deliveries", () => {
  const userId = 1;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-webhooks-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    const dbModule = await import("../models/db.js");
    await dbModule.initDatabase();
    db = dbModule.db;
    webhookService = await import("./webhookService.js");
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
    vi.unstubAllGlobals();
    db.prepare("DELETE FROM webhook_deliveries").run();
    db.prepare("DELETE FROM webhooks").run();
    db.prepare("DELETE FROM users").run();
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(userId, "webhook-owner@example.com", "hash");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function createWebhook() {
    return webhookService.createWebhook(userId, "https://hooks.example.com/cena", "Cena Hook", ["project.created"]);
  }

  function insertDueDelivery(webhookId: number, overrides: { attempt?: number; statusCode?: number | null } = {}) {
    db.prepare(
      `INSERT INTO webhook_deliveries
        (webhook_id, event, payload, status_code, success, error, attempt, next_retry_at, created_at)
       VALUES (?, 'project.created', ?, ?, 0, 'HTTP 500', ?, '2026-08-22T11:59:00.000Z', '2026-08-22T11:58:00.000Z')`,
    ).run(webhookId, JSON.stringify({ projectId: 7 }), overrides.statusCode ?? 500, overrides.attempt ?? 1);
  }

  it("retries a due transient failure and records a successful second attempt", async () => {
    const webhook = await createWebhook();
    insertDueDelivery(webhook.id);
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await webhookService.retryFailedDeliveries();

    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.example.com/cena");
    expect((init as RequestInit).headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Cena-Event": "project.created",
    });

    const rows = db.prepare("SELECT success, attempt, next_retry_at, final_failed_at FROM webhook_deliveries ORDER BY id").all() as Array<{
      success: number;
      attempt: number;
      next_retry_at: string | null;
      final_failed_at: string | null;
    }>;
    expect(rows).toEqual([
      { success: 0, attempt: 1, next_retry_at: null, final_failed_at: null },
      { success: 1, attempt: 2, next_retry_at: null, final_failed_at: null },
    ]);
  });

  it("schedules another retry for a retryable 5xx response", async () => {
    const webhook = await createWebhook();
    insertDueDelivery(webhook.id);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("temporarily down", { status: 503 })));

    const result = await webhookService.retryFailedDeliveries();

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1 });
    const latest = db.prepare("SELECT success, attempt, next_retry_at, final_failed_at FROM webhook_deliveries ORDER BY id DESC LIMIT 1").get() as {
      success: number;
      attempt: number;
      next_retry_at: string | null;
      final_failed_at: string | null;
    };
    expect(latest.success).toBe(0);
    expect(latest.attempt).toBe(2);
    expect(latest.next_retry_at).toBe("2026-08-22T12:00:30.000Z");
    expect(latest.final_failed_at).toBeNull();
  });

  it("finalizes a non-retryable client error without scheduling another attempt", async () => {
    const webhook = await createWebhook();
    insertDueDelivery(webhook.id);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad request", { status: 400 })));

    const result = await webhookService.retryFailedDeliveries();

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1 });
    const latest = db.prepare("SELECT success, attempt, next_retry_at, final_failed_at FROM webhook_deliveries ORDER BY id DESC LIMIT 1").get() as {
      success: number;
      attempt: number;
      next_retry_at: string | null;
      final_failed_at: string | null;
    };
    expect(latest.success).toBe(0);
    expect(latest.attempt).toBe(2);
    expect(latest.next_retry_at).toBeNull();
    expect(latest.final_failed_at).toBe("2026-08-22T12:00:00.000Z");
  });
});
