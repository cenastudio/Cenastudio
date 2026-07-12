import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan } from "../middleware/planAccess.js";
import {
  listProjectTasks,
  createProjectTask,
  listMyTasks,
  listAssignableMembers,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

const router = Router();

router.use(authenticate, requireOperationalPlan);

router.get("/mine", listMyTasks);
router.get("/projects/:projectId", listProjectTasks);
router.post("/projects/:projectId", createProjectTask);
router.get("/projects/:projectId/assignable-members", listAssignableMembers);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;
