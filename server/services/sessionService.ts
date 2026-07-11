import crypto from "crypto";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

/**
 * Session tracking for the "active sessions" feature on the Profile page.
 *
 * We never store the raw JWT — only a SHA-256 hash of it, so a leaked DB
 * row can't be used to forge a session. `authenticate` middleware already
 * verifies the JWT signature; this table only tracks *which* verified
 * tokens are currently considered active, for revocation + device list UX.
 */

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Best-effort device label from a User-Agent string, no external dependency. */
export function parseDeviceLabel(userAgent: string | undefined): string {
  if (!userAgent) return "Dispositivo desconhecido";

  const ua = userAgent;
  let browser = "Navegador";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";

  let os = "dispositivo";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Linux/.test(ua)) os = "Linux";

  return `${browser} no ${os}`;
}

export interface SessionRecord {
  id: number;
  deviceLabel: string;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  current: boolean;
}

/**
 * Records or refreshes a session row for a just-verified token.
 * Fire-and-forget from the caller's perspective — failures are logged, not thrown,
 * so a session-tracking hiccup never breaks authentication itself.
 */
export function trackSession(
  userId: number,
  token: string,
  userAgent: string | undefined,
  ipAddress: string | undefined,
): void {
  void upsertSession(userId, token, userAgent, ipAddress).catch((error) => {
    console.error("[sessionService] Falha ao registrar sessão:", error);
  });
}

async function upsertSession(
  userId: number,
  token: string,
  userAgent: string | undefined,
  ipAddress: string | undefined,
): Promise<void> {
  const tokenHash = hashToken(token);
  const deviceLabel = parseDeviceLabel(userAgent);

  if (shouldUsePrisma) {
    await prisma.userSession.upsert({
      where: { tokenHash },
      create: {
        userId: BigInt(userId),
        tokenHash,
        userAgent: userAgent ?? null,
        deviceLabel,
        ipAddress: ipAddress ?? null,
      },
      update: {
        lastActiveAt: new Date(),
        revokedAt: null,
      },
    });
    return;
  }

  const existing = db.prepare("SELECT id FROM user_sessions WHERE token_hash = ?").get(tokenHash);
  if (existing) {
    db.prepare("UPDATE user_sessions SET last_active_at = datetime('now'), revoked_at = NULL WHERE token_hash = ?").run(tokenHash);
    return;
  }
  db.prepare(
    `INSERT INTO user_sessions (user_id, token_hash, user_agent, device_label, ip_address, last_active_at, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  ).run(userId, tokenHash, userAgent ?? null, deviceLabel, ipAddress ?? null);
}

/** Lists non-revoked sessions for a user, most recently active first. */
export async function listSessions(userId: number, currentToken: string): Promise<SessionRecord[]> {
  const currentHash = hashToken(currentToken);

  if (shouldUsePrisma) {
    const rows = await prisma.userSession.findMany({
      where: { userId: BigInt(userId), revokedAt: null },
      orderBy: { lastActiveAt: "desc" },
    });
    return rows.map((row) => ({
      id: Number(row.id),
      deviceLabel: row.deviceLabel ?? "Dispositivo desconhecido",
      ipAddress: row.ipAddress,
      lastActiveAt: row.lastActiveAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      current: row.tokenHash === currentHash,
    }));
  }

  const rows = db
    .prepare(
      `SELECT id, device_label, ip_address, last_active_at, created_at, token_hash
       FROM user_sessions WHERE user_id = ? AND revoked_at IS NULL
       ORDER BY last_active_at DESC`,
    )
    .all(userId) as Array<{
      id: number; device_label: string | null; ip_address: string | null;
      last_active_at: string; created_at: string; token_hash: string;
    }>;

  return rows.map((row) => ({
    id: row.id,
    deviceLabel: row.device_label ?? "Dispositivo desconhecido",
    ipAddress: row.ip_address,
    lastActiveAt: row.last_active_at,
    createdAt: row.created_at,
    current: row.token_hash === currentHash,
  }));
}

/** Revokes a single session by id, scoped to the owning user. */
export async function revokeSession(userId: number, sessionId: number): Promise<boolean> {
  if (shouldUsePrisma) {
    const result = await prisma.userSession.updateMany({
      where: { id: BigInt(sessionId), userId: BigInt(userId), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count > 0;
  }

  const result = db
    .prepare("UPDATE user_sessions SET revoked_at = datetime('now') WHERE id = ? AND user_id = ? AND revoked_at IS NULL")
    .run(sessionId, userId);
  return (result as any).changes > 0;
}

/** Revokes every session for a user except the current one. */
export async function revokeAllOtherSessions(userId: number, currentToken: string): Promise<number> {
  const currentHash = hashToken(currentToken);

  if (shouldUsePrisma) {
    const result = await prisma.userSession.updateMany({
      where: { userId: BigInt(userId), revokedAt: null, tokenHash: { not: currentHash } },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  const result = db
    .prepare("UPDATE user_sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL AND token_hash != ?")
    .run(userId, currentHash);
  return (result as any).changes;
}

/** Whether a given (already JWT-verified) token has been revoked at the session-tracking level. */
export async function isTokenRevoked(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);

  if (shouldUsePrisma) {
    const row = await prisma.userSession.findUnique({
      where: { tokenHash },
      select: { revokedAt: true },
    });
    // No row yet (e.g. very first request right after login, before the
    // fire-and-forget trackSession() write lands) is not treated as revoked.
    return row?.revokedAt != null;
  }

  const row = db.prepare("SELECT revoked_at FROM user_sessions WHERE token_hash = ?").get(tokenHash) as
    | { revoked_at: string | null }
    | undefined;
  return Boolean(row?.revoked_at);
}
