/**
 * Admin Service
 *
 * Backend for the admin control center (Phase 1): rich user detail,
 * account suspension, subscription/comp management, forced password reset,
 * and real dashboard metrics. Admin-only — all callers go through
 * `requireAdmin`.
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionStatus = "active" | "trial" | "canceled";

export interface AdminUserDetail {
  id: number;
  name: string | null;
  email: string;
  role: string;
  disabled: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  phone: string | null;
  studioName: string | null;
  createdAt: string;
  subscription: {
    planId: string;
    planName: string;
    status: string;
    generationLimit: number;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  } | null;
  usage: {
    projects: number;
    files: number;
    videoReviews: number;
    clients: number;
    generations: number;
  };
  lastActivityAt: string | null;
  referrals: { total: number; converted: number };
}

/** Full profile + subscription + usage for a single user (admin detail view). */
export async function getUserDetail(userId: number): Promise<AdminUserDetail> {
  if (!shouldUsePrisma) {
    return getUserDetailSqlite(userId);
  }

  const uid = BigInt(userId);
  const user = await prisma.user.findUnique({
    where: { id: uid },
    include: {
      subscriptions: { include: { plan: true }, orderBy: { id: "desc" }, take: 1 },
      _count: {
        select: { projects: true, files: true, videoReviews: true, clients: true, generations: true },
      },
    },
  });
  if (!user) throw new AppError("Usuário não encontrado", 404);

  const sub = user.subscriptions[0];
  const lastActivity = await prisma.activityLog.findFirst({
    where: { userId: uid },
    orderBy: { timestamp: "desc" },
    select: { timestamp: true },
  });
  const referralTotal = await prisma.referral.count({ where: { referrerId: uid } });
  const referralConverted = await prisma.referral.count({
    where: { referrerId: uid, status: { in: ["converted", "rewarded"] } },
  });

  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    disabled: user.disabled,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    phone: user.phone,
    studioName: user.studioName,
    createdAt: user.createdAt.toISOString(),
    subscription: sub
      ? {
          planId: sub.planId,
          planName: sub.plan.name,
          status: sub.status,
          generationLimit: sub.plan.generationLimit,
          trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
          currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
          stripeCustomerId: sub.stripeCustomerId,
          stripeSubscriptionId: sub.stripeSubscriptionId,
        }
      : null,
    usage: {
      projects: user._count.projects,
      files: user._count.files,
      videoReviews: user._count.videoReviews,
      clients: user._count.clients,
      generations: user._count.generations,
    },
    lastActivityAt: lastActivity?.timestamp ? lastActivity.timestamp.toISOString() : null,
    referrals: { total: referralTotal, converted: referralConverted },
  };
}

function getUserDetailSqlite(userId: number): AdminUserDetail {
  const user = db
    .prepare(
      `SELECT id, name, email, role, disabled, email_verified, two_factor_enabled,
              phone, studio_name, created_at
       FROM users WHERE id = ?`,
    )
    .get(userId) as any;
  if (!user) throw new AppError("Usuário não encontrado", 404);

  const sub = db
    .prepare(
      `SELECT s.plan_id, s.status, s.trial_ends_at, s.current_period_end,
              s.stripe_customer_id, s.stripe_subscription_id,
              p.name as plan_name, p.generation_limit
       FROM subscriptions s JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = ? ORDER BY s.id DESC LIMIT 1`,
    )
    .get(userId) as any;

  const count = (sql: string) => (db.prepare(sql).get(userId) as { c: number }).c;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    disabled: Boolean(user.disabled),
    emailVerified: Boolean(user.email_verified),
    twoFactorEnabled: Boolean(user.two_factor_enabled),
    phone: user.phone,
    studioName: user.studio_name,
    createdAt: user.created_at,
    subscription: sub
      ? {
          planId: sub.plan_id,
          planName: sub.plan_name,
          status: sub.status,
          generationLimit: sub.generation_limit,
          trialEndsAt: sub.trial_ends_at,
          currentPeriodEnd: sub.current_period_end,
          stripeCustomerId: sub.stripe_customer_id,
          stripeSubscriptionId: sub.stripe_subscription_id,
        }
      : null,
    usage: {
      projects: count("SELECT COUNT(*) c FROM projects WHERE user_id = ?"),
      files: count("SELECT COUNT(*) c FROM files WHERE user_id = ?"),
      videoReviews: count("SELECT COUNT(*) c FROM video_reviews WHERE user_id = ?"),
      clients: count("SELECT COUNT(*) c FROM clients WHERE user_id = ?"),
      generations: count("SELECT COUNT(*) c FROM generations WHERE user_id = ?"),
    },
    lastActivityAt: null,
    referrals: { total: 0, converted: 0 },
  };
}

/** Suspend or reactivate an account. Protects self and the last admin. */
export async function setUserDisabled(userId: number, disabled: boolean, actorId: number): Promise<void> {
  if (userId === actorId && disabled) {
    throw new AppError("Você não pode suspender a própria conta.", 400);
  }

  if (shouldUsePrisma) {
    const user = await prisma.user.findUnique({ where: { id: BigInt(userId) }, select: { role: true } });
    if (!user) throw new AppError("Usuário não encontrado", 404);
    if (user.role === "admin" && disabled) {
      const activeAdmins = await prisma.user.count({ where: { role: "admin", disabled: false } });
      if (activeAdmins <= 1) throw new AppError("Mantenha pelo menos um administrador ativo.", 400);
    }
    await prisma.user.update({ where: { id: BigInt(userId) }, data: { disabled } });
    return;
  }

  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  if (!user) throw new AppError("Usuário não encontrado", 404);
  if (user.role === "admin" && disabled) {
    const activeAdmins = (db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'admin' AND disabled = 0").get() as { c: number }).c;
    if (activeAdmins <= 1) throw new AppError("Mantenha pelo menos um administrador ativo.", 400);
  }
  db.prepare("UPDATE users SET disabled = ? WHERE id = ?").run(disabled ? 1 : 0, userId);
}

/**
 * Grant/adjust a subscription manually (comp plan, extend trial, or cancel).
 * status:
 *  - "active":  paid/comped access, clears trial, sets a 30-day period.
 *  - "trial":   trial for `trialDays` (default 14) on the given plan.
 *  - "canceled": keeps the plan record but marks it canceled now.
 */
export async function adminUpdateSubscription(
  userId: number,
  opts: { planId: string; status: SubscriptionStatus; trialDays?: number },
): Promise<void> {
  const { planId, status } = opts;
  const trialDays = opts.trialDays && opts.trialDays > 0 ? opts.trialDays : 14;
  const now = new Date();
  const trialEnd = new Date(now.getTime() + trialDays * DAY_MS);
  const periodEnd = new Date(now.getTime() + 30 * DAY_MS);

  if (shouldUsePrisma) {
    const validPlan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true } });
    if (!validPlan) throw new AppError("Plano inválido", 400);
    const existing = await prisma.subscription.findFirst({
      where: { userId: BigInt(userId) },
      orderBy: { id: "desc" },
    });
    const data = {
      planId,
      status,
      trialEndsAt: status === "trial" ? trialEnd : null,
      currentPeriodEnd: status === "canceled" ? now : status === "trial" ? trialEnd : periodEnd,
    };
    if (existing) {
      await prisma.subscription.update({ where: { id: existing.id }, data });
    } else {
      await prisma.subscription.create({ data: { userId: BigInt(userId), ...data } });
    }
    return;
  }

  const validPlan = db.prepare("SELECT id FROM plans WHERE id = ?").get(planId);
  if (!validPlan) throw new AppError("Plano inválido", 400);
  const existing = db.prepare("SELECT id FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(userId) as
    | { id: number }
    | undefined;
  const trialIso = status === "trial" ? trialEnd.toISOString() : null;
  const periodIso = (status === "canceled" ? now : status === "trial" ? trialEnd : periodEnd).toISOString();
  if (existing) {
    db.prepare("UPDATE subscriptions SET plan_id = ?, status = ?, trial_ends_at = ?, current_period_end = ? WHERE id = ?").run(
      planId, status, trialIso, periodIso, existing.id,
    );
  } else {
    db.prepare("INSERT INTO subscriptions (user_id, plan_id, status, trial_ends_at, current_period_end) VALUES (?, ?, ?, ?, ?)").run(
      userId, planId, status, trialIso, periodIso,
    );
  }
}

/**
 * Force a password reset: sets a strong temporary password and flags the
 * account so the user must change it on next login. Returns the temp
 * password once, for the admin to relay to the user.
 */
export async function forcePasswordReset(userId: number): Promise<{ tempPassword: string }> {
  const tempPassword = crypto.randomBytes(9).toString("base64url"); // ~12 chars, URL-safe
  const hash = bcrypt.hashSync(tempPassword, 12);

  if (shouldUsePrisma) {
    const user = await prisma.user.findUnique({ where: { id: BigInt(userId) }, select: { id: true } });
    if (!user) throw new AppError("Usuário não encontrado", 404);
    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { passwordHash: hash, mustResetPassword: true },
    });
    return { tempPassword };
  }

  const result = db.prepare("UPDATE users SET password_hash = ?, must_reset_password = 1 WHERE id = ?").run(hash, userId);
  if (result.changes === 0) throw new AppError("Usuário não encontrado", 404);
  return { tempPassword };
}

export interface AdminMetrics {
  totalUsers: number;
  admins: number;
  disabled: number;
  newUsers7d: number;
  newUsers30d: number;
  byPlan: Record<string, number>;
  trials: number;
  paidActive: number;
  mrrBrl: number;
}

/** Real dashboard metrics for the admin overview. */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  const since7 = new Date(Date.now() - 7 * DAY_MS);
  const since30 = new Date(Date.now() - 30 * DAY_MS);

  if (shouldUsePrisma) {
    const [totalUsers, admins, disabled, newUsers7d, newUsers30d, trials] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "admin" } }),
      prisma.user.count({ where: { disabled: true } }),
      prisma.user.count({ where: { createdAt: { gte: since7 } } }),
      prisma.user.count({ where: { createdAt: { gte: since30 } } }),
      prisma.subscription.count({ where: { status: "trial" } }),
    ]);

    // Active subscriptions grouped by plan, with plan prices for MRR.
    const activeSubs = await prisma.subscription.findMany({
      where: { status: "active" },
      include: { plan: { select: { id: true, priceBrl: true } } },
    });
    const byPlan: Record<string, number> = {};
    let mrrBrl = 0;
    let paidActive = 0;
    for (const s of activeSubs) {
      byPlan[s.planId] = (byPlan[s.planId] || 0) + 1;
      if (s.plan.priceBrl > 0) {
        paidActive += 1;
        mrrBrl += s.plan.priceBrl;
      }
    }
    return { totalUsers, admins, disabled, newUsers7d, newUsers30d, byPlan, trials, paidActive, mrrBrl };
  }

  const scalar = (sql: string, ...params: unknown[]) => (db.prepare(sql).get(...params) as { c: number }).c;
  const totalUsers = scalar("SELECT COUNT(*) c FROM users");
  const admins = scalar("SELECT COUNT(*) c FROM users WHERE role = 'admin'");
  const disabled = scalar("SELECT COUNT(*) c FROM users WHERE disabled = 1");
  const newUsers7d = scalar("SELECT COUNT(*) c FROM users WHERE created_at >= datetime('now', '-7 days')");
  const newUsers30d = scalar("SELECT COUNT(*) c FROM users WHERE created_at >= datetime('now', '-30 days')");
  const trials = scalar("SELECT COUNT(*) c FROM subscriptions WHERE status = 'trial'");
  const rows = db
    .prepare(
      `SELECT s.plan_id, p.price_brl FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.status = 'active'`,
    )
    .all() as Array<{ plan_id: string; price_brl: number }>;
  const byPlan: Record<string, number> = {};
  let mrrBrl = 0;
  let paidActive = 0;
  for (const r of rows) {
    byPlan[r.plan_id] = (byPlan[r.plan_id] || 0) + 1;
    if (r.price_brl > 0) {
      paidActive += 1;
      mrrBrl += r.price_brl;
    }
  }
  return { totalUsers, admins, disabled, newUsers7d, newUsers30d, byPlan, trials, paidActive, mrrBrl };
}
