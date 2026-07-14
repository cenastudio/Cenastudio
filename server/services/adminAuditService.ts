/**
 * Admin Audit Log (Phase 2 — admin security)
 *
 * Records every mutation made through /admin/* — who (admin id + email
 * snapshot), what action, on which target, from which IP/device, and when.
 * Logging is best-effort: a logging failure must never block the admin
 * action itself (mirrors the pattern in sessionService.trackSession).
 */

import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

export interface AdminActionLogEntry {
  id: number;
  adminId: number;
  adminEmail: string;
  action: string;
  targetId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export async function logAdminAction(params: {
  adminId: number;
  adminEmail: string;
  action: string;
  targetId?: string | number | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const targetId = params.targetId != null ? String(params.targetId) : null;
  const details = params.details ?? {};

  try {
    if (shouldUsePrisma) {
      await prisma.adminAction.create({
        data: {
          adminId: BigInt(params.adminId),
          adminEmail: params.adminEmail,
          action: params.action,
          targetId,
          details: details as any,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });
      return;
    }

    db.prepare(
      `INSERT INTO admin_actions (admin_id, admin_email, action, target_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      params.adminId,
      params.adminEmail,
      params.action,
      targetId,
      JSON.stringify(details),
      params.ipAddress ?? null,
      params.userAgent ?? null,
    );
  } catch (error) {
    console.error("[adminAuditService] Falha ao registrar ação admin:", error);
  }
}

/** Lists recent admin actions, most recent first. Used by the audit log tab. */
export async function listAdminActions(limit = 100): Promise<AdminActionLogEntry[]> {
  if (shouldUsePrisma) {
    const rows = await prisma.adminAction.findMany({
      orderBy: { id: "desc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: Number(row.id),
      adminId: Number(row.adminId),
      adminEmail: row.adminEmail,
      action: row.action,
      targetId: row.targetId,
      details: (row.details as Record<string, unknown>) ?? {},
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  const rows = db
    .prepare(
      `SELECT id, admin_id, admin_email, action, target_id, details, ip_address, user_agent, created_at
       FROM admin_actions ORDER BY id DESC LIMIT ?`,
    )
    .all(limit) as Array<{
      id: number; admin_id: number; admin_email: string; action: string; target_id: string | null;
      details: string | null; ip_address: string | null; user_agent: string | null; created_at: string;
    }>;

  return rows.map((row) => ({
    id: row.id,
    adminId: row.admin_id,
    adminEmail: row.admin_email,
    action: row.action,
    targetId: row.target_id,
    details: row.details ? JSON.parse(row.details) : {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}
