import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  listAllVideoReviews,
  listVideoReviews,
  getVideoReview,
  createVideoReview,
  updateVideoReview,
  deleteVideoReview,
  generateShareLink,
  accessSharedReview,
  streamSharedReviewVideo,
  addComment,
  addSharedComment,
  updateSharedReviewStatus,
  resolveComment,
  deleteComment,
} from "../controllers/videoReviewsController.js";

const router = Router();

// All video review routes require authentication except shared access
router.use(authenticate);

// List all reviews for the current user
router.get("/", listAllVideoReviews);

// List reviews for a project
router.get("/projects/:projectId", listVideoReviews);

// Get a specific review with comments
router.get("/:id", getVideoReview);

// Create a new review
router.post("/", createVideoReview);

// Update a review
router.put("/:id", updateVideoReview);

// Delete a review
router.delete("/:id", deleteVideoReview);

// Generate shareable link
router.post("/:id/share", generateShareLink);

// Add comment to a review
router.post("/:id/comments", addComment);

// Resolve/unresolve a comment
router.put("/comments/:id/resolve", resolveComment);

// Delete a comment
router.delete("/comments/:id", deleteComment);

// Public route for accessing shared reviews (no authentication required)
export const publicRouter = Router();
publicRouter.get("/shared/:token", accessSharedReview);
publicRouter.get("/shared/:token/video", streamSharedReviewVideo);
publicRouter.post("/shared/:token/comments", addSharedComment);
publicRouter.patch("/shared/:token/status", updateSharedReviewStatus);

export default router;
