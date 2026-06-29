import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getOverallAnalytics,
  getProjectAnalytics,
  getRevenueAnalytics,
  getActivityAnalytics,
  getFinancialOverview,
  createFinancialEntry,
  updateFinancialEntry,
  deleteFinancialEntry,
} from "../controllers/analyticsController.js";

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// Get overall analytics
router.get("/overall", getOverallAnalytics);

// Get project-specific analytics
router.get("/projects/:id", getProjectAnalytics);

// Get revenue analytics
router.get("/revenue", getRevenueAnalytics);
router.get("/finance", getFinancialOverview);
router.post("/finance/entries", createFinancialEntry);
router.patch("/finance/entries/:id", updateFinancialEntry);
router.delete("/finance/entries/:id", deleteFinancialEntry);

// Get activity analytics
router.get("/activity", getActivityAnalytics);

export default router;
