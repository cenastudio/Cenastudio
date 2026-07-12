import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan } from "../middleware/planAccess.js";
import {
  listProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
} from "../controllers/projectMembersController.js";

const router = Router();

// All project member routes require authentication
router.use(authenticate, requireOperationalPlan);

// List members for a project
router.get("/projects/:projectId", listProjectMembers);

// Add a member to a project
router.post("/projects/:projectId", addProjectMember);

// Update member role
router.put("/:id", updateProjectMember);

// Remove a member from a project
router.delete("/:id", removeProjectMember);

export default router;
