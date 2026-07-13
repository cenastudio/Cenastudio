import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan } from "../middleware/planAccess.js";
import {
  listFiles,
  listAllFiles,
  uploadFile,
  deleteFile,
  getFile,
  downloadFile,
  renameFile,
  linkFileToProject,
} from "../controllers/filesController.js";

const router = Router();

// All file routes require authentication
router.use(authenticate, requireOperationalPlan);

// List all files across all projects (Assets library)
router.get("/all", listAllFiles);

// List files for a project
router.get("/projects/:projectId", listFiles);

// Upload a file
router.post("/upload", uploadFile);

// Get file info
router.get("/:id", getFile);

// Download file
router.get("/:id/download", downloadFile);

// Rename a file
router.patch("/:id/rename", renameFile);

// Link file to project
router.put("/:id/link", linkFileToProject);

// Delete a file
router.delete("/:id", deleteFile);

export default router;
