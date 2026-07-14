/**
 * Admin view of the referral program (Phase 3).
 *
 * Read-only reporting on top of the referral tracking + reward logic that
 * already lives in referralService.ts — this is the "who indicated whom,
 * who got rewarded, and how many rewards has the program paid out" view
 * for the admin panel.
 */

import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { db } from "../models/db.js";

export interface ReferralAdminSummary {
  totalReferrals: number;
  totalConverted: number;
  totalRewarded: number;
  rewardsByType: Record<string, number>;
}

export interface ReferralAdminEntry {
  id: number;
  referralCode: string;
  status: string;
  rewardType: string | null;
  conversionDate: string | null;
  rewardDate: string | null;
  createdAt: string;
  referrer: { id: number; email: string; name: string | null };
  referredUser: { id: number; email: string; name: string | null } | null;
}

export async function getReferralAdminSummary(): Promise<ReferralAdminSummary> {
  if (shouldUsePrisma) {
    const [totalReferrals, totalConverted, rewarded] = await Promise.all([
      prisma.referral.count(),
      prisma.referral.count({ where: { status: { in: ["converted", "rewarded"] } } }),
      prisma.referral.findMany({ where: { status: "rewarded" }, select: { rewardType: true } }),
    ]);
    const rewardsByType: Record<string, number> = {};
    for (const r of rewarded) {
      const key = r.rewardType || "unknown";
      rewardsByType[key] = (rewardsByType[key] || 0) + 1;
    }
    return { totalReferrals, totalConverted, totalRewarded: rewarded.length, rewardsByType };
  }

  const scalar = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
  return {
    totalReferrals: scalar("SELECT COUNT(*) c FROM referrals"),
    totalConverted: scalar("SELECT COUNT(*) c FROM referrals WHERE status IN ('converted','rewarded')"),
    totalRewarded: scalar("SELECT COUNT(*) c FROM referrals WHERE status = 'rewarded'"),
    rewardsByType: {},
  };
}

/** Lists referrals across all users, most recent first — for the admin table. */
export async function listAllReferrals(limit = 100): Promise<ReferralAdminEntry[]> {
  if (!shouldUsePrisma) return [];

  const rows = await prisma.referral.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      referrer: { select: { id: true, email: true, name: true } },
      referredUser: { select: { id: true, email: true, name: true } },
    },
  });

  return rows.map((r) => ({
    id: Number(r.id),
    referralCode: r.referralCode,
    status: r.status,
    rewardType: r.rewardType,
    conversionDate: r.conversionDate ? r.conversionDate.toISOString() : null,
    rewardDate: r.rewardDate ? r.rewardDate.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    referrer: { id: Number(r.referrer.id), email: r.referrer.email, name: r.referrer.name },
    referredUser: r.referredUser
      ? { id: Number(r.referredUser.id), email: r.referredUser.email, name: r.referredUser.name }
      : null,
  }));
}
