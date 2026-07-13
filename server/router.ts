// Force rebuild: 2026-07-04 15:45 - CRITICAL FIX
import { Router, type RequestHandler } from "express";
import adminRoutes from "./routes/admin.js";
import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
import stripeCheckoutRoutes from "./routes/checkout.js";
import { contactRouter } from "./routes/contact.js";
import toolsRoutes from "./routes/tools.js";
import projectsRoutes from "./routes/projects.js";
import clientsRoutes from "./routes/clients.js";
import exportRoutes from "./routes/export.js";
import filesRoutes from "./routes/files.js";
import analyticsRoutes from "./routes/analytics.js";
import projectMembersRoutes from "./routes/projectMembers.js";
import studioSettingsRoutes from "./routes/studioSettings.js";
import demoRoutes from "./routes/demo.js";
import dashboardRoutes from "./routes/dashboard.js";
import checklistRoutes from "./routes/checklist.js";
import commercialRoutes from "./routes/commercial.js";
import teamRoutes from "./routes/team.js";
import {
  getActivityAnalytics,
  getOverallAnalytics,
  getProjectAnalytics,
  getRevenueAnalytics,
  getFinancialOverview,
  createFinancialEntry,
  updateFinancialEntry,
  deleteFinancialEntry,
} from "./controllers/analyticsController.js";
import {
  listPlans,
  getPlan,
} from "./controllers/plansController.js";
import { exportPipeline } from "./controllers/exportController.js";
import {
  createOpportunity,
  deleteOpportunity,
  getOpportunity,
  getPipelineStats,
  listOpportunities,
  updateOpportunity,
} from "./controllers/opportunitiesController.js";
import {
  createInteraction,
  deleteInteraction,
  getUpcomingFollowUps,
  listInteractions,
  updateInteraction,
} from "./controllers/interactionsController.js";
import { getPublicMeeting, downloadPublicMeetingIcs } from "./controllers/meetingsController.js";
import { getPublicProposal, acceptPublicProposal } from "./controllers/proposalsController.js";
import {
  listUsers,
  updateUserPlan,
  updateUserRole,
} from "./controllers/adminController.js";
import videoReviewsRoutes, { publicRouter as videoReviewsPublicRoutes } from "./routes/videoReviews.js";
import videoUploadRoutes from "./routes/videoUpload.js";
import {
  accessSharedReview,
  addComment,
  addSharedComment,
  deleteComment,
  generateShareLink,
  getVideoReview,
  resolveComment,
  streamSharedReviewVideo,
  updateSharedReviewStatus,
  updateVideoReview,
} from "./controllers/videoReviewsController.js";
import { authenticate, requireAdmin } from "./middleware/authenticate.js";
import notificationsRoutes from "./routes/notifications.js";
import aiFeaturesRoutes from "./routes/aiFeatures.js";
import sessionsRoutes from "./routes/sessions.js";
import webhooksRoutes from "./routes/webhooks.js";
import budgetsRoutes from "./routes/budgets.js";
import equipmentRoutes from "./routes/equipment.js";
import shotlistsRoutes from "./routes/shotlists.js";
import shotTypesRoutes from "./routes/shotTypes.js";
import timesheetsRoutes from "./routes/timesheets.js";
import calendarRoutes from "./routes/calendar.js";
import tasksRoutes from "./routes/tasks.js";

const router = Router();

const withParam =
  (paramName: string, sourceName: string, handler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    const value = req.params[sourceName] || req.body?.[sourceName] || req.query[sourceName];
    if (value !== undefined) {
      req.params[paramName] = String(value);
    }
    return handler(req, res, next);
  };

router.use("/auth", authRoutes);
router.use("/tools", toolsRoutes);
router.use("/ai", aiRoutes);
router.use("/admin", adminRoutes);
router.use("/contact", contactRouter);
router.use("/checkout", stripeCheckoutRoutes);
router.use("/projects", projectsRoutes);
router.use("/clients", clientsRoutes);
router.use("/export", exportRoutes);
router.use("/files", filesRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/project-members", projectMembersRoutes);
router.use("/studio-settings", studioSettingsRoutes);
router.use("/demo", demoRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/checklist", checklistRoutes);
router.use("/commercial", commercialRoutes);
router.use("/team", teamRoutes);
router.get("/analytics-overall", authenticate, getOverallAnalytics);
router.get("/analytics-revenue", authenticate, getRevenueAnalytics);
router.get("/analytics-activity", authenticate, getActivityAnalytics);
router.get("/analytics-project", authenticate, withParam("id", "id", getProjectAnalytics));
router.get("/export-pipeline", authenticate, exportPipeline);
router.get("/admin-users", authenticate, requireAdmin, listUsers);
router.put("/admin-user-role", authenticate, requireAdmin, withParam("id", "userId", updateUserRole));
router.put("/admin-user-plan", authenticate, requireAdmin, withParam("id", "userId", updateUserPlan));
router.get("/pipeline-opportunities", authenticate, listOpportunities);
router.get("/pipeline-stats", authenticate, getPipelineStats);
router.get("/pipeline-opportunity", authenticate, withParam("id", "id", getOpportunity));
router.post("/pipeline-opportunity", authenticate, createOpportunity);
router.put("/pipeline-opportunity", authenticate, withParam("id", "id", updateOpportunity));
router.delete("/pipeline-opportunity", authenticate, withParam("id", "id", deleteOpportunity));

// Aliases for opportunities (more RESTful)
router.get("/opportunities", authenticate, listOpportunities);
router.get("/opportunities/stats", authenticate, getPipelineStats);
router.get("/opportunities/:id", authenticate, withParam("id", "id", getOpportunity));
router.post("/opportunities", authenticate, createOpportunity);
router.put("/opportunities/:id", authenticate, withParam("id", "id", updateOpportunity));
router.delete("/opportunities/:id", authenticate, withParam("id", "id", deleteOpportunity));

// Interactions routes
router.get("/interactions", authenticate, listInteractions);
router.get("/interactions/follow-ups", authenticate, getUpcomingFollowUps);
router.post("/interactions", authenticate, createInteraction);
router.put("/interactions/:id", authenticate, withParam("id", "id", updateInteraction));
router.delete("/interactions/:id", authenticate, withParam("id", "id", deleteInteraction));

// Financial entries routes
router.get("/financial-entries", authenticate, getFinancialOverview);
router.post("/financial-entries", authenticate, createFinancialEntry);
router.put("/financial-entries/:id", authenticate, withParam("id", "id", updateFinancialEntry));
router.delete("/financial-entries/:id", authenticate, withParam("id", "id", deleteFinancialEntry));

// Plans routes (public)
router.get("/plans", listPlans);
router.get("/plans/:id", getPlan);

// Stats route (alias for analytics-overall)
router.get("/stats", authenticate, getOverallAnalytics);
router.get("/video-review", authenticate, withParam("id", "id", getVideoReview));
router.put("/video-review", authenticate, withParam("id", "id", updateVideoReview));
router.post("/video-review-share", authenticate, withParam("id", "reviewId", generateShareLink));
router.post("/video-review-comment", authenticate, withParam("id", "reviewId", addComment));
router.put("/video-review-comment-resolve", authenticate, withParam("id", "commentId", resolveComment));
router.delete("/video-review-comment", authenticate, withParam("id", "commentId", deleteComment));
router.get("/public-review", withParam("token", "token", accessSharedReview));
router.get("/public-review-video", withParam("token", "token", streamSharedReviewVideo));
router.post("/public-review-comment", withParam("token", "token", addSharedComment));
router.patch("/public-review-status", withParam("token", "token", updateSharedReviewStatus));
router.get("/public-meeting/:token", getPublicMeeting);
router.get("/public-meeting/:token/ics", downloadPublicMeetingIcs);
router.get("/public-proposal/:token", getPublicProposal);
router.post("/public-proposal/:token/accept", acceptPublicProposal);
router.use("/video-reviews", videoReviewsRoutes);
router.use("/public/video-reviews", videoReviewsPublicRoutes);
router.use("/video-upload", videoUploadRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/ai-features", aiFeaturesRoutes);
router.use("/sessions", sessionsRoutes);
router.use("/webhooks", webhooksRoutes);
router.use("/budgets", budgetsRoutes);
router.use("/equipment", equipmentRoutes);
router.use("/shotlists", shotlistsRoutes);
router.use("/shot-types", shotTypesRoutes);
router.use("/timesheets", timesheetsRoutes);
router.use("/calendar", calendarRoutes);
router.use("/tasks", tasksRoutes);

export default router;
