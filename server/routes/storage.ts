import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { getStorageStats, getProjectStorageStats } from "../controllers/storageController";

const router = Router();

/**
 * GET /api/storage/stats
 * Get storage statistics for authenticated user
 * Returns: total used, quota, breakdown by type, top files
 */
router.get("/stats", authenticate, getStorageStats);

/**
 * GET /api/storage/stats/project/:projectId
 * Get storage statistics for a specific project
 * Returns: total used for project, breakdown by type, top files
 */
router.get("/stats/project/:projectId", authenticate, getProjectStorageStats);

export default router;
