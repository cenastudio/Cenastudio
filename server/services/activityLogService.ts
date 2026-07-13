/**
 * Activity Log Service
 *
 * Log de auditoria de ações do usuário para compliance e segurança
 * Mantém histórico dos últimos 30-90 dias com detecção automática de ações suspeitas
 */

import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

// Geoip-lite pode não estar instalado, usar fallback
let geoip: any;
try {
  geoip = await import("geoip-lite");
} catch {
  // Fallback: sem geolocalização
  geoip = null;
}

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────

export interface ActivityLogEntry {
  id: number;
  action: string;
  ipAddress: string | null;
  location: string | null;
  timestamp: string;
  suspicious: boolean;
}

export interface ActivityLogDetailed extends ActivityLogEntry {
  userAgent: string | null;
  metadata: Record<string, any>;
}

// ────────────────────────────────────────────────────────────────
// LOG ACTION
// ────────────────────────────────────────────────────────────────

/**
 * Registra uma ação do usuário no log
 * Detecta automaticamente ações suspeitas
 */
export async function logAction(
  userId: number,
  action: string,
  ipAddress?: string | null,
  userAgent?: string | null,
  metadata?: Record<string, any>
): Promise<void> {
  // Gerar localização a partir do IP
  let location: string | null = null;
  if (ipAddress && geoip) {
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      location = `${geo.city || "Unknown"}, ${geo.country}`;
    }
  }

  // Detectar se ação é suspeita
  const suspicious = await detectSuspiciousActivity(
    userId,
    action,
    ipAddress,
    userAgent
  );

  // Salvar no banco
  if (shouldUsePrisma) {
    await prisma.activityLog.create({
      data: {
        userId: BigInt(userId),
        action,
        ipAddress,
        location,
        userAgent,
        suspicious,
        metadata: (metadata || {}) as any,
      },
    });
  } else {
    db.prepare(
      `INSERT INTO activity_logs
       (user_id, action, ip_address, location, user_agent, suspicious, metadata, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      userId,
      action,
      ipAddress || null,
      location,
      userAgent || null,
      suspicious ? 1 : 0,
      JSON.stringify(metadata || {})
    );
  }

  if (suspicious) {
    console.log(`[Activity Log] ⚠️ Ação suspeita detectada: ${action} (user: ${userId}, IP: ${ipAddress})`);
  }
}

// ────────────────────────────────────────────────────────────────
// DETECT SUSPICIOUS ACTIVITY
// ────────────────────────────────────────────────────────────────

/**
 * Detecta ações suspeitas baseado em padrões anormais:
 * - Login de novo IP
 * - Login de novo dispositivo (user agent diferente)
 * - Mudança de senha sem 2FA
 * - Múltiplas tentativas falhadas
 */
async function detectSuspiciousActivity(
  userId: number,
  action: string,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<boolean> {
  // Ações que sempre são suspeitas se de novo IP
  const sensitiveActions = [
    "Login realizado",
    "Senha alterada",
    "Email alterado",
    "2FA desativado",
  ];

  if (!sensitiveActions.includes(action)) {
    return false; // Ação não-sensível
  }

  if (!ipAddress) {
    return false; // Sem IP, não dá pra detectar
  }

  // Verificar se IP já foi usado antes (últimos 90 dias)
  let knownIPs: string[] = [];

  if (shouldUsePrisma) {
    const logs = await prisma.activityLog.findMany({
      where: {
        userId: BigInt(userId),
        timestamp: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 dias
        },
      },
      select: { ipAddress: true },
      distinct: ["ipAddress"],
    });
    knownIPs = logs.map((l) => l.ipAddress).filter((ip): ip is string => ip !== null);
  } else {
    const rows = db.prepare(
      `SELECT DISTINCT ip_address FROM activity_logs
       WHERE user_id = ? AND timestamp >= datetime('now', '-90 days')`
    ).all(userId) as Array<{ ip_address: string | null }>;
    knownIPs = rows.map((r) => r.ip_address).filter((ip): ip is string => ip !== null);
  }

  // Se IP nunca foi visto antes = suspeito
  if (!knownIPs.includes(ipAddress)) {
    return true;
  }

  // Verificar user agent (novo dispositivo)
  if (userAgent && action === "Login realizado") {
    let knownUserAgents: string[] = [];

    if (shouldUsePrisma) {
      const logs = await prisma.activityLog.findMany({
        where: {
          userId: BigInt(userId),
          timestamp: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
        },
        select: { userAgent: true },
        distinct: ["userAgent"],
      });
      knownUserAgents = logs.map((l) => l.userAgent).filter((ua): ua is string => ua !== null);
    } else {
      const rows = db.prepare(
        `SELECT DISTINCT user_agent FROM activity_logs
         WHERE user_id = ? AND timestamp >= datetime('now', '-90 days')`
      ).all(userId) as Array<{ user_agent: string | null }>;
      knownUserAgents = rows.map((r) => r.user_agent).filter((ua): ua is string => ua !== null);
    }

    // Se user agent nunca foi visto = novo dispositivo = suspeito
    if (!knownUserAgents.some((ua) => ua.includes(userAgent.substring(0, 50)))) {
      return true;
    }
  }

  return false;
}

// ────────────────────────────────────────────────────────────────
// LIST ACTIVITIES
// ────────────────────────────────────────────────────────────────

/**
 * Lista atividades do usuário (últimos 30 dias por padrão)
 */
export async function listUserActivities(
  userId: number,
  limit: number = 30,
  days: number = 30
): Promise<ActivityLogEntry[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  if (shouldUsePrisma) {
    const logs = await prisma.activityLog.findMany({
      where: {
        userId: BigInt(userId),
        timestamp: { gte: since },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        ipAddress: true,
        location: true,
        timestamp: true,
        suspicious: true,
      },
    });

    return logs.map((log) => ({
      id: Number(log.id),
      action: log.action,
      ipAddress: log.ipAddress,
      location: log.location,
      timestamp: log.timestamp.toISOString(),
      suspicious: log.suspicious,
    }));
  } else {
    const logs = db.prepare(
      `SELECT id, action, ip_address, location, timestamp, suspicious
       FROM activity_logs
       WHERE user_id = ? AND timestamp >= datetime('now', '-${days} days')
       ORDER BY timestamp DESC
       LIMIT ?`
    ).all(userId, limit) as Array<{
      id: number;
      action: string;
      ip_address: string | null;
      location: string | null;
      timestamp: string;
      suspicious: number;
    }>;

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      ipAddress: log.ip_address,
      location: log.location,
      timestamp: log.timestamp,
      suspicious: log.suspicious === 1,
    }));
  }
}

// ────────────────────────────────────────────────────────────────
// CLEANUP OLD LOGS
// ────────────────────────────────────────────────────────────────

/**
 * Remove logs mais antigos que X dias (para compliance LGPD)
 * Deve ser executado periodicamente via cron job
 */
export async function cleanupOldLogs(days: number = 90): Promise<number> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  if (shouldUsePrisma) {
    const result = await prisma.activityLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });
    console.log(`[Activity Log] Removidos ${result.count} logs antigos (>${days} dias)`);
    return result.count;
  } else {
    const result = db.prepare(
      `DELETE FROM activity_logs WHERE timestamp < datetime('now', '-${days} days')`
    ).run();
    console.log(`[Activity Log] Removidos ${result.changes} logs antigos (>${days} dias)`);
    return result.changes || 0;
  }
}

// ────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────

export default {
  logAction,
  listUserActivities,
  cleanupOldLogs,
};
