import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { db } from "../models/db.js";
import crypto from "crypto";

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

    // TODO: Send notification to referrer
    // TODO: Apply reward (extend subscription, upgrade plan, etc.)

    return true;
  } catch (error) {
    console.error("Error tracking referral conversion:", error);
    return false;
  }
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
