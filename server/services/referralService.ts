import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { db } from "../models/db.js";
import { notifyUser } from "./notificationService.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Milestone → reward map. Cumulative: reaching the Nth conversion grants
 * that milestone's reward once, in addition to any milestone already
 * granted below it (checked one-by-one in `maybeApplyMilestoneRewards`).
 */
const REWARD_MILESTONES: Array<{ conversions: number; rewardType: string; days: number; minPlan: "free" | "pro" | "studio" }> = [
  { conversions: 1, rewardType: "1month", days: 30, minPlan: "free" },
  { conversions: 3, rewardType: "3months_pro", days: 90, minPlan: "pro" },
  { conversions: 10, rewardType: "1year_studio", days: 365, minPlan: "studio" },
];

interface ReferralStats {
  totalReferrals: number;
  convertedReferrals: number;
  pendingReferrals: number;
  totalRewards: number;
  nextRewardProgress: {
    current: number;
    target: number;
    percentage: number;
    rewardType: string;
  };
}

interface ReferralInfo {
  code: string;
  url: string;
  stats: ReferralStats;
}

/**
 * Generate a unique referral code for a user
 * Format: First 4-6 letters of email + 3 random digits
 */
function generateReferralCode(email: string): string {
  const base = email
    .split("@")[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .substring(0, 6);
  const random = Math.floor(100 + Math.random() * 900); // 100-999
  return `${base}${random}`;
}

/**
 * Get or create referral code for a user
 */
export async function getUserReferralInfo(userId: number, userEmail: string): Promise<ReferralInfo> {
  if (!shouldUsePrisma) {
    // SQLite fallback - return mock data
    return {
      code: generateReferralCode(userEmail),
      url: `https://cenastudio.com.br/r/${generateReferralCode(userEmail)}`,
      stats: {
        totalReferrals: 0,
        convertedReferrals: 0,
        pendingReferrals: 0,
        totalRewards: 0,
        nextRewardProgress: {
          current: 0,
          target: 1,
          percentage: 0,
          rewardType: "1month",
        },
      },
    };
  }

  // Check if user already has a referral code
  let referral = await prisma.referral.findFirst({
    where: { referrerId: BigInt(userId) },
  });

  // If not, create one
  if (!referral) {
    const code = generateReferralCode(userEmail);
    referral = await prisma.referral.create({
      data: {
        referrerId: BigInt(userId),
        referralCode: code,
        status: "pending",
      },
    });
  }

  // Get stats
  const stats = await getReferralStats(userId);

  return {
    code: referral.referralCode,
    url: `https://cenastudio.com.br/r/${referral.referralCode}`,
    stats,
  };
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: number): Promise<ReferralStats> {
  if (!shouldUsePrisma) {
    return {
      totalReferrals: 0,
      convertedReferrals: 0,
      pendingReferrals: 0,
      totalRewards: 0,
      nextRewardProgress: {
        current: 0,
        target: 1,
        percentage: 0,
        rewardType: "1month",
      },
    };
  }

  // Count referrals by status
  const totalReferrals = await prisma.referral.count({
    where: { referrerId: BigInt(userId) },
  });

  const convertedReferrals = await prisma.referral.count({
    where: {
      referrerId: BigInt(userId),
      status: "converted",
    },
  });

  const pendingReferrals = await prisma.referral.count({
    where: {
      referrerId: BigInt(userId),
      status: "pending",
    },
  });

  const rewardedReferrals = await prisma.referral.count({
    where: {
      referrerId: BigInt(userId),
      status: "rewarded",
    },
  });

  // Calculate next reward progress
  let nextRewardTarget = 1;
  let rewardType = "1month";

  if (convertedReferrals >= 10) {
    nextRewardTarget = 10;
    rewardType = "1year_studio";
  } else if (convertedReferrals >= 3) {
    nextRewardTarget = 10;
    rewardType = "1year_studio";
  } else if (convertedReferrals >= 1) {
    nextRewardTarget = 3;
    rewardType = "3months_pro";
  } else {
    nextRewardTarget = 1;
    rewardType = "1month";
  }

  const progress = Math.min(100, (convertedReferrals / nextRewardTarget) * 100);

  return {
    totalReferrals,
    convertedReferrals,
    pendingReferrals,
    totalRewards: rewardedReferrals,
    nextRewardProgress: {
      current: convertedReferrals,
      target: nextRewardTarget,
      percentage: progress,
      rewardType,
    },
  };
}

/**
 * Track a referral conversion (when someone signs up using a referral code)
 */
export async function trackReferralConversion(
  referralCode: string,
  newUserId: number
): Promise<boolean> {
  if (!shouldUsePrisma) {
    return false;
  }

  try {
    // Find the referral by code
    const referral = await prisma.referral.findUnique({
      where: { referralCode },
    });

    if (!referral) {
      return false;
    }

    // Update referral with the new user
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        referredUserId: BigInt(newUserId),
        status: "converted",
        conversionDate: new Date(),
      },
    });

    const referrerId = Number(referral.referrerId);
    notifyUser(
      referrerId,
      "Nova indicação convertida! 🎉",
      "Alguém se cadastrou usando seu código de indicação.",
    );

    // Best-effort: a reward hiccup must never break the signup that
    // triggered it. Errors are logged, not thrown.
    await maybeApplyMilestoneRewards(referrerId).catch((err) => {
      console.error("[referralService] Falha ao aplicar recompensa:", err);
    });

    return true;
  } catch (error) {
    console.error("Error tracking referral conversion:", error);
    return false;
  }
}

/**
 * Checks the referrer's converted-referral count against the milestone
 * table and grants any milestone reached that hasn't been rewarded yet.
 * Each milestone can only be rewarded once — we mark the referral that
 * completed the count (the Nth converted one) as "rewarded" so re-running
 * this never double-grants.
 */
async function maybeApplyMilestoneRewards(referrerId: number): Promise<void> {
  if (!shouldUsePrisma) return;

  const convertedReferrals = await prisma.referral.findMany({
    where: { referrerId: BigInt(referrerId), status: { in: ["converted", "rewarded"] } },
    orderBy: { conversionDate: "asc" },
  });

  for (const milestone of REWARD_MILESTONES) {
    if (convertedReferrals.length < milestone.conversions) continue;

    // The referral at index [conversions - 1] is the one that completed
    // this milestone. If it's already "rewarded", this milestone was
    // already granted — skip.
    const milestoneReferral = convertedReferrals[milestone.conversions - 1];
    if (milestoneReferral.status === "rewarded") continue;

    await applyReward(referrerId, milestone);

    await prisma.referral.update({
      where: { id: milestoneReferral.id },
      data: { status: "rewarded", rewardDate: new Date(), rewardType: milestone.rewardType },
    });
  }
}

/**
 * Grants a referral reward by extending the referrer's subscription:
 * upgrades to at least `minPlan` if they're on a lower tier, and extends
 * `currentPeriodEnd` by `days` (stacking on top of the current period end
 * if it's still in the future, so rewards accumulate instead of resetting
 * an active paid period).
 */
async function applyReward(referrerId: number, milestone: { rewardType: string; days: number; minPlan: "free" | "pro" | "studio" }): Promise<void> {
  const planRank: Record<string, number> = { free: 0, pro: 1, studio: 2, whitelabel: 3, enterprise: 4 };

  const existing = await prisma.subscription.findFirst({
    where: { userId: BigInt(referrerId) },
    orderBy: { id: "desc" },
  });

  const currentPlan = existing?.planId ?? "free";
  const targetPlan = (planRank[currentPlan] ?? 0) >= planRank[milestone.minPlan] ? currentPlan : milestone.minPlan;

  const base = existing?.currentPeriodEnd && existing.currentPeriodEnd.getTime() > Date.now()
    ? existing.currentPeriodEnd
    : new Date();
  const newPeriodEnd = new Date(base.getTime() + milestone.days * DAY_MS);

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { planId: targetPlan, status: "active", currentPeriodEnd: newPeriodEnd },
    });
  } else {
    await prisma.subscription.create({
      data: { userId: BigInt(referrerId), planId: targetPlan, status: "active", currentPeriodEnd: newPeriodEnd },
    });
  }

  const rewardLabels: Record<string, string> = {
    "1month": "1 mês grátis",
    "3months_pro": "3 meses de Pro",
    "1year_studio": "1 ano de Studio",
  };
  notifyUser(
    referrerId,
    "Recompensa de indicação aplicada! 🎁",
    `Você ganhou ${rewardLabels[milestone.rewardType] || milestone.rewardType} por indicar novos usuários.`,
  );
}

/**
 * List all referrals for a user
 */
export async function listUserReferrals(userId: number) {
  if (!shouldUsePrisma) {
    return [];
  }

  const referrals = await prisma.referral.findMany({
    where: { referrerId: BigInt(userId) },
    include: {
      referredUser: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return referrals.map((r) => ({
    id: Number(r.id),
    code: r.referralCode,
    status: r.status,
    conversionDate: r.conversionDate,
    rewardType: r.rewardType,
    referredUser: r.referredUser
      ? {
          id: Number(r.referredUser.id),
          email: r.referredUser.email,
          name: r.referredUser.name,
          createdAt: r.referredUser.createdAt,
        }
      : null,
  }));
}
