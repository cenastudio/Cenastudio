import crypto from "crypto";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

/**
 * Generic outbound webhooks: users register a URL + which events they care
 * about, and we POST a signed JSON payload whenever that event happens
 * (project created, video review approved, proposal accepted, etc).
 *
 * Design choices:
 * - Delivery is fire-and-forget from the caller's perspective (never blocks
 *   or fails the request that triggered the event).
 * - Each webhook has its own `secret`, used to sign the payload via
 *   HMAC-SHA256 in the `X-Cena-Signature` header, so the receiving end can
 *   verify the request really came from us (same pattern as Stripe/GitHub).
 * - Delivery attempts are logged in `webhook_deliveries` so users can see
 *   what was sent and whether it succeeded, from the UI.
 * - Retry: up to 3 attempts with a short backoff, only for network errors
 *   or 5xx responses. 4xx responses (bad URL, auth rejected) are not
 *   retried — that's a configuration problem on the receiving end.
 */

export const WEBHOOK_EVENTS = [
  { id: "project.created", label: "Projeto criado" },
  { id: "project.status_changed", label: "Status do projeto alterado" },
  { id: "video_review.approved", label: "Vídeo aprovado pelo cliente" },
  { id: "video_review.changes_requested", label: "Cliente pediu alterações no vídeo" },
  { id: "proposal.accepted", label: "Proposta comercial aceita" },
  { id: "client.created", label: "Cliente cadastrado" },
] as const;

export type WebhookEventId = (typeof WEBHOOK_EVENTS)[number]["id"];

export interface WebhookRecord {
  id: number;
  url: string;
  label: string;
  events: string[];
  active: boolean;
  lastStatus: number | null;
  lastFiredAt: string | null;
  createdAt: string;
  /** Only returned once, right after creation — never on subsequent list calls. */
  secret?: string;
}

function generateSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

function signPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function serializeEvents(events: unknown): string[] {
  if (Array.isArray(events)) return events as string[];
  if (typeof events === "string") {
    try {
      const parsed = JSON.parse(events);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function listWebhooks(userId: number): Promise<WebhookRecord[]> {
  if (shouldUsePrisma) {
    const rows = await prisma.webhook.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: Number(row.id),
      url: row.url,
      label: row.label,
      events: serializeEvents(row.events),
      active: row.active,
      lastStatus: row.lastStatus,
      lastFiredAt: row.lastFiredAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  const rows = db
    .prepare(
      `SELECT id, url, label, events, active, last_status, last_fired_at, created_at
       FROM webhooks WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId) as Array<{
      id: number; url: string; label: string; events: string; active: number;
      last_status: number | null; last_fired_at: string | null; created_at: string;
    }>;

  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    label: row.label,
    events: serializeEvents(row.events),
    active: Boolean(row.active),
    lastStatus: row.last_status,
    lastFiredAt: row.last_fired_at,
    createdAt: row.created_at,
  }));
}

export async function createWebhook(
  userId: number,
  url: string,
  label: string,
  events: string[],
): Promise<WebhookRecord> {
  const secret = generateSecret();

  if (shouldUsePrisma) {
    const created = await prisma.webhook.create({
      data: { userId: BigInt(userId), url, label, events, secret },
    });
    return {
      id: Number(created.id),
      url: created.url,
      label: created.label,
      events: serializeEvents(created.events),
      active: created.active,
      lastStatus: null,
      lastFiredAt: null,
      createdAt: created.createdAt.toISOString(),
      secret,
    };
  }

  const result = db
    .prepare(
      `INSERT INTO webhooks (user_id, url, label, events, secret, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
    )
    .run(userId, url, label, JSON.stringify(events), secret);

  return {
    id: Number((result as any).lastInsertRowid),
    url,
    label,
    events,
    active: true,
    lastStatus: null,
    lastFiredAt: null,
    createdAt: new Date().toISOString(),
    secret,
  };
}

export async function updateWebhook(
  userId: number,
  webhookId: number,
  data: { url?: string; label?: string; events?: string[]; active?: boolean },
): Promise<boolean> {
  if (shouldUsePrisma) {
    const result = await prisma.webhook.updateMany({
      where: { id: BigInt(webhookId), userId: BigInt(userId) },
      data: { ...data, updatedAt: new Date() },
    });
    return result.count > 0;
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.url !== undefined) { fields.push("url = ?"); values.push(data.url); }
  if (data.label !== undefined) { fields.push("label = ?"); values.push(data.label); }
  if (data.events !== undefined) { fields.push("events = ?"); values.push(JSON.stringify(data.events)); }
  if (data.active !== undefined) { fields.push("active = ?"); values.push(data.active ? 1 : 0); }
  if (fields.length === 0) return false;

  fields.push("updated_at = datetime('now')");
  const result = db
    .prepare(`UPDATE webhooks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`)
    .run(...values, webhookId, userId);
  return (result as any).changes > 0;
}

export async function deleteWebhook(userId: number, webhookId: number): Promise<boolean> {
  if (shouldUsePrisma) {
    const result = await prisma.webhook.deleteMany({
      where: { id: BigInt(webhookId), userId: BigInt(userId) },
    });
    return result.count > 0;
  }

  const result = db.prepare("DELETE FROM webhooks WHERE id = ? AND user_id = ?").run(webhookId, userId);
  return (result as any).changes > 0;
}

export interface DeliveryRecord {
  id: number;
  event: string;
  statusCode: number | null;
  success: boolean;
  error: string | null;
  attempt: number;
  createdAt: string;
}

export async function listDeliveries(userId: number, webhookId: number): Promise<DeliveryRecord[]> {
  if (shouldUsePrisma) {
    const webhook = await prisma.webhook.findFirst({
      where: { id: BigInt(webhookId), userId: BigInt(userId) },
      select: { id: true },
    });
    if (!webhook) return [];

    const rows = await prisma.webhookDelivery.findMany({
      where: { webhookId: webhook.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((row) => ({
      id: Number(row.id),
      event: row.event,
      statusCode: row.statusCode,
      success: row.success,
      error: row.error,
      attempt: row.attempt,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  const webhook = db.prepare("SELECT id FROM webhooks WHERE id = ? AND user_id = ?").get(webhookId, userId);
  if (!webhook) return [];

  const rows = db
    .prepare(
      `SELECT id, event, status_code, success, error, attempt, created_at
       FROM webhook_deliveries WHERE webhook_id = ? ORDER BY created_at DESC LIMIT 50`,
    )
    .all(webhookId) as Array<{
      id: number; event: string; status_code: number | null; success: number;
      error: string | null; attempt: number; created_at: string;
    }>;

  return rows.map((row) => ({
    id: row.id,
    event: row.event,
    statusCode: row.status_code,
    success: Boolean(row.success),
    error: row.error,
    attempt: row.attempt,
    createdAt: row.created_at,
  }));
}

/**
 * Sends a test ping to a webhook so the user can verify their endpoint
 * before relying on it for real events.
 */
export async function sendTestPing(userId: number, webhookId: number): Promise<{ success: boolean; statusCode: number | null; error: string | null }> {
  const target = shouldUsePrisma
    ? await prisma.webhook.findFirst({ where: { id: BigInt(webhookId), userId: BigInt(userId) } })
    : (db.prepare("SELECT * FROM webhooks WHERE id = ? AND user_id = ?").get(webhookId, userId) as any);

  if (!target) throw new Error("Webhook não encontrado");

  const url = target.url;
  const secret = target.secret;
  const result = await deliverOnce(url, secret, "webhook.test", { message: "Ping de teste do Cena Studio" });
  await logDelivery(webhookId, "webhook.test", { message: "Ping de teste do Cena Studio" }, result, 1);
  return result;
}

/**
 * Fire-and-forget dispatch for a real product event. Looks up every active
 * webhook a user has registered for this event and delivers to all of them
 * in parallel, with retry on transient failures.
 */
export function dispatchWebhookEvent(userId: number, event: WebhookEventId, payload: Record<string, unknown>): void {
  void dispatchAsync(userId, event, payload).catch((error) => {
    console.error(`[webhookService] Falha ao disparar evento ${event}:`, error);
  });
}

async function dispatchAsync(userId: number, event: WebhookEventId, payload: Record<string, unknown>): Promise<void> {
  const webhooks = shouldUsePrisma
    ? await prisma.webhook.findMany({ where: { userId: BigInt(userId), active: true } })
    : (db.prepare("SELECT * FROM webhooks WHERE user_id = ? AND active = 1").all(userId) as any[]);

  const matching = webhooks.filter((webhook: any) => serializeEvents(webhook.events).includes(event));
  if (matching.length === 0) return;

  await Promise.all(matching.map((webhook: any) => deliverWithRetry(webhook, event, payload)));
}

async function deliverWithRetry(webhook: any, event: string, payload: Record<string, unknown>): Promise<void> {
  const maxAttempts = 3;
  let lastResult: { success: boolean; statusCode: number | null; error: string | null } = {
    success: false,
    statusCode: null,
    error: null,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastResult = await deliverOnce(webhook.url, webhook.secret, event, payload);
    await logDelivery(Number(webhook.id), event, payload, lastResult, attempt);

    if (lastResult.success) break;
    // Only retry on network errors or 5xx — a 4xx means the endpoint itself
    // rejected the request, retrying identically won't help.
    const isRetryable = lastResult.statusCode == null || lastResult.statusCode >= 500;
    if (!isRetryable) break;
    if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }

  await updateLastFired(Number(webhook.id), lastResult.statusCode);
}

async function deliverOnce(
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; statusCode: number | null; error: string | null }> {
  const body = JSON.stringify({ event, data: payload, sentAt: new Date().toISOString() });
  const signature = signPayload(secret, body);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cena-Event": event,
        "X-Cena-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return { success: response.ok, statusCode: response.status, error: response.ok ? null : `HTTP ${response.status}` };
  } catch (error) {
    return { success: false, statusCode: null, error: error instanceof Error ? error.message : "Falha de rede" };
  }
}

async function logDelivery(
  webhookId: number,
  event: string,
  payload: Record<string, unknown>,
  result: { success: boolean; statusCode: number | null; error: string | null },
  attempt: number,
): Promise<void> {
  if (shouldUsePrisma) {
    await prisma.webhookDelivery.create({
      data: {
        webhookId: BigInt(webhookId),
        event,
        payload,
        statusCode: result.statusCode,
        success: result.success,
        error: result.error,
        attempt,
      },
    });
    return;
  }

  db.prepare(
    `INSERT INTO webhook_deliveries (webhook_id, event, payload, status_code, success, error, attempt, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  ).run(webhookId, event, JSON.stringify(payload), result.statusCode, result.success ? 1 : 0, result.error, attempt);
}

async function updateLastFired(webhookId: number, statusCode: number | null): Promise<void> {
  if (shouldUsePrisma) {
    await prisma.webhook.update({
      where: { id: BigInt(webhookId) },
      data: { lastStatus: statusCode, lastFiredAt: new Date() },
    });
    return;
  }
  db.prepare("UPDATE webhooks SET last_status = ?, last_fired_at = datetime('now') WHERE id = ?").run(statusCode, webhookId);
}
