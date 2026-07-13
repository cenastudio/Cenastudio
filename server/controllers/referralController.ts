import { Request, Response } from "express";
import {
  getUserReferralInfo,
  getReferralStats,
  listUserReferrals,
} from "../services/referralService.js";

/**
 * GET /api/referrals/my-code
 * Get the authenticated user's referral code and stats
 */
export async function getMyReferralCode(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    const referralInfo = await getUserReferralInfo(Number(userId), userEmail);

    res.status(200).json({
      success: true,
      data: referralInfo,
    });
  } catch (error) {
    console.error("Error fetching referral code:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch referral code",
    });
  }
}

/**
 * GET /api/referrals/stats
 * Get referral statistics for the authenticated user
 */
export async function getMyReferralStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    const stats = await getReferralStats(Number(userId));

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch referral stats",
    });
  }
}

/**
 * GET /api/referrals/list
 * List all referrals made by the authenticated user
 */
export async function listMyReferrals(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    const referrals = await listUserReferrals(Number(userId));

    res.status(200).json({
      success: true,
      data: referrals,
    });
  } catch (error) {
    console.error("Error listing referrals:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list referrals",
    });
  }
}
