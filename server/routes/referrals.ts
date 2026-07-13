import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getMyReferralCode,
  getMyReferralStats,
  listMyReferrals,
} from "../controllers/referralController.js";

const router = Router();

/**
 * GET /api/referrals/my-code
 * Get the authenticated user's referral code and info
 */
router.get("/my-code", authenticate, getMyReferralCode);

/**
 * GET /api/referrals/stats
 * Get referral statistics
 */
router.get("/stats", authenticate, getMyReferralStats);

/**
 * GET /api/referrals/list
 * List all referrals made by the user
 */
router.get("/list", authenticate, listMyReferrals);

export default router;
