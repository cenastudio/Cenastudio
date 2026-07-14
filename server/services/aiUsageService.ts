/**
 * AI usage reporting for the admin panel (Phase 3).
 *
 * Reports real generation volume by tool, by day, and by top users. We
 * deliberately do NOT report an estimated cost in R$/USD: the `generations`
 * table doesn't store token counts or which model/provider served each
 * call (several tools fall back across a chain of free OpenRouter models —
 * see aiService.ts), so any R$ figure here would be a fabricated number
 * dressed up as data. Volume is real and useful on its own for spotting
 * abuse or gauging which tools matter most.
 */

import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { db } from "../models/db.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AiUsageReport {
  totalGenerations: number;
  last24h: number;
  last7d: number;
  last30d: number;
  byTool: Array<{ toolId: string; toolName: string; count: number }>;
  topUsers: Array<{ userId: number; email: string; count: number }>;
}

export async function getAiUsageReport(): Promise<AiUsageReport> {
  const since24h = new Date(Date.now() - DAY_MS);
  const since7d = new Date(Date.now() - 7 * DAY_MS);
  const since30d = new Date(Date.now() - 30 * DAY_MS);

  if (shouldUsePrisma) {
    const [totalGenerations, last24h, last7d, last30d, byToolRaw] = await Promise.all([
      prisma.generation.count(),
      prisma.generation.count({ where: { createdAt: { gte: since24h } } }),
      prisma.generation.count({ where: { createdAt: { gte: since7d } } }),
      prisma.generation.count({ where: { createdAt: { gte: since30d } } }),
      prisma.generation.groupBy({ by: ["toolId"], _count: true }),
    ]);

    const toolIds = byToolRaw.map((r) => r.toolId).filter((id): id is string => id != null);
    const tools = toolIds.length
      ? await prisma.tool.findMany({ where: { id: { in: toolIds } }, select: { id: true, name: true } })
      : [];
    const toolNameById = new Map(tools.map((t) => [t.id, t.name]));

    const byTool = byToolRaw
      .filter((r) => r.toolId != null)
      .map((r) => ({ toolId: r.toolId as string, toolName: toolNameById.get(r.toolId as string) ?? r.toolId as string, count: r._count }))
      .sort((a, b) => b.count - a.count);

    const topUsersRaw = await prisma.generation.groupBy({
      by: ["userId"],
      _count: true,
      orderBy: { _count: { userId: "desc" } },
      take: 10,
      where: { userId: { not: null } },
    });
    const userIds = topUsersRaw.map((r) => r.userId).filter((id): id is bigint => id != null);
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
      : [];
    const emailById = new Map(users.map((u) => [Number(u.id), u.email]));
    const topUsers = topUsersRaw
      .filter((r) => r.userId != null)
      .map((r) => ({ userId: Number(r.userId), email: emailById.get(Number(r.userId)) ?? "—", count: r._count }));

    return { totalGenerations, last24h, last7d, last30d, byTool, topUsers };
  }

  const scalar = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
  const byToolRows = db
    .prepare(
      `SELECT g.tool_id as toolId, t.name as toolName, COUNT(*) as count
       FROM generations g LEFT JOIN tools t ON t.id = g.tool_id
       WHERE g.tool_id IS NOT NULL GROUP BY g.tool_id ORDER BY count DESC`,
    )
    .all() as Array<{ toolId: string; toolName: string | null; count: number }>;
  const topUserRows = db
    .prepare(
      `SELECT g.user_id as userId, u.email as email, COUNT(*) as count
       FROM generations g JOIN users u ON u.id = g.user_id
       WHERE g.user_id IS NOT NULL GROUP BY g.user_id ORDER BY count DESC LIMIT 10`,
    )
    .all() as Array<{ userId: number; email: string; count: number }>;

  return {
    totalGenerations: scalar("SELECT COUNT(*) c FROM generations"),
    last24h: scalar("SELECT COUNT(*) c FROM generations WHERE created_at >= datetime('now', '-1 day')"),
    last7d: scalar("SELECT COUNT(*) c FROM generations WHERE created_at >= datetime('now', '-7 days')"),
    last30d: scalar("SELECT COUNT(*) c FROM generations WHERE created_at >= datetime('now', '-30 days')"),
    byTool: byToolRows.map((r) => ({ toolId: r.toolId, toolName: r.toolName ?? r.toolId, count: r.count })),
    topUsers: topUserRows.map((r) => ({ userId: r.userId, email: r.email, count: r.count })),
  };
}
