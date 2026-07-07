import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan } from "../middleware/planAccess.js";
import {
  getOverallAnalytics,
  getProjectAnalytics,
  getRevenueAnalytics,
  getActivityAnalytics,
  getFinancialOverview,
  createFinancialEntry,
  updateFinancialEntry,
  deleteFinancialEntry,
  // Analytics Premium - Dashboards
  getDashboards,
  createDashboard,
  getDashboard,
  updateDashboard,
  deleteDashboard,
  // Analytics Premium - Widgets
  createWidget,
  updateWidget,
  deleteWidget,
  getWidgetDataHandler,
  // Analytics Premium - Reports
  getReports,
  createReport,
  getReport,
  updateReport,
  deleteReport,
  runReport,
  getReportExecutions,
} from "../controllers/analyticsController.js";

const router = Router();

// All analytics routes require authentication + owner access (team members cannot see finances)
router.use(authenticate, requireOperationalPlan);

import { ownerOnly } from "../middleware/teamAccess.js";

// Get overall analytics
router.get("/overall", getOverallAnalytics);

// Get project-specific analytics
router.get("/projects/:id", getProjectAnalytics);

// Get revenue analytics (owner only)
router.get("/revenue", ownerOnly, getRevenueAnalytics);
router.get("/finance", ownerOnly, getFinancialOverview);
router.post("/finance/entries", ownerOnly, createFinancialEntry);
router.patch("/finance/entries/:id", ownerOnly, updateFinancialEntry);
router.delete("/finance/entries/:id", ownerOnly, deleteFinancialEntry);

// Get activity analytics
router.get("/activity", getActivityAnalytics);

// ===============================================
// ANALYTICS PREMIUM - Dashboards
// ===============================================
router.get("/dashboards", getDashboards);
router.post("/dashboards", createDashboard);
router.get("/dashboards/:id", getDashboard);
router.put("/dashboards/:id", updateDashboard);
router.delete("/dashboards/:id", deleteDashboard);

// ===============================================
// ANALYTICS PREMIUM - Widgets
// ===============================================
router.post("/widgets", createWidget);
router.put("/widgets/:id", updateWidget);
router.delete("/widgets/:id", deleteWidget);
router.get("/widgets/:id/data", getWidgetDataHandler);

// ===============================================
// ANALYTICS PREMIUM - Reports
// ===============================================
router.get("/reports", getReports);
router.post("/reports", createReport);
router.get("/reports/:id", getReport);
router.put("/reports/:id", updateReport);
router.delete("/reports/:id", deleteReport);
router.post("/reports/:id/run", runReport);
router.get("/reports/:id/executions", getReportExecutions);

export default router;
