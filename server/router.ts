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
import collaboratorsRoutes from "./routes/collaborators.js";
import analyticsRoutes from "./routes/analytics.js";
import projectMembersRoutes from "./routes/projectMembers.js";
import {
  createOpportunity,
  deleteOpportunity,
  getOpportunity,
  getPipelineStats,
  listOpportunities,
  updateOpportunity,
} from "./controllers/opportunitiesController.js";
import videoReviewsRoutes, { publicRouter as videoReviewsPublicRoutes } from "./routes/videoReviews.js";
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
import { authenticate } from "./middleware/authenticate.js";
import notificationsRoutes from "./routes/notifications.js";

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
router.use("/collaborators", collaboratorsRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/project-members", projectMembersRoutes);
router.get("/pipeline-opportunities", authenticate, listOpportunities);
router.get("/pipeline-stats", authenticate, getPipelineStats);
router.get("/pipeline-opportunity", authenticate, withParam("id", "id", getOpportunity));
router.post("/pipeline-opportunity", authenticate, createOpportunity);
router.put("/pipeline-opportunity", authenticate, withParam("id", "id", updateOpportunity));
router.delete("/pipeline-opportunity", authenticate, withParam("id", "id", deleteOpportunity));
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
router.use("/video-reviews", videoReviewsRoutes);
router.use("/public/video-reviews", videoReviewsPublicRoutes);
router.use("/notifications", notificationsRoutes);

export default router;
