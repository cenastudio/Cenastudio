import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireStudioPlan } from "../middleware/planAccess.js";
import { getOverview, updateBudgetBaseline, addEntry, deleteEntry } from "../controllers/budgetController.js";

const router = Router();

router.use(authenticate, requireStudioPlan("budgetTracking"));

router.get("/:projectId", getOverview);
router.put("/:projectId", updateBudgetBaseline);
router.post("/:projectId/entries", addEntry);
router.delete("/entries/:id", deleteEntry);

export default router;
