import { Request, Response } from "express";
import { calculateStorageStats, calculateProjectStorageStats } from "../services/storageService";

/**
 * Get storage statistics for the authenticated user
 * GET /api/storage/stats
 */
export async function getStorageStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    const stats = await calculateStorageStats(Number(userId));

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching storage stats:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch storage statistics",
    });
  }
}

/**
 * Get storage statistics for a specific project
 * GET /api/storage/stats/project/:projectId
 */
export async function getProjectStorageStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const projectId = parseInt(req.params.projectId);

    if (!userId) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    if (isNaN(projectId)) {
      res.status(400).json({
        success: false,
        error: "Invalid project ID",
      });
      return;
    }

    const stats = await calculateProjectStorageStats(projectId, Number(userId));

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching project storage stats:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch project storage statistics",
    });
  }
}
