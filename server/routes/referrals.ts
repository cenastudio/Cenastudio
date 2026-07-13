import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getMyReferralCode,
  listMyReferrals,
} from "../controllers/referralController.js";

const router = Router();

/**
 * GET /api/referrals/my-code
 * Get the authenticated user's referral code, info and stats
 * (stats are embedded here — a separate /stats endpoint would be redundant)
 */
router.get("/my-code", authenticate, getMyReferralCode);

/**
 * GET /api/referrals/list
 * List all referrals made by the user
 */
router.get("/list", authenticate, listMyReferrals);

export default router;
