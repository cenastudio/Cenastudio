import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireStudioPlan } from "../middleware/planAccess.js";
import { getReport, updateSettings } from "../controllers/dreController.js";

const router = Router();

router.use(authenticate, requireStudioPlan("projectDre"));

router.get("/:projectId", getReport);
router.put("/:projectId/settings", updateSettings);

export default router;
