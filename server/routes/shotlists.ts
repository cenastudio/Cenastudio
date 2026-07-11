import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireStudioPlan } from "../middleware/planAccess.js";
import { getShotList, addShot, updateShot, deleteShot, reorderShots } from "../controllers/shotListController.js";

const router = Router();

router.use(authenticate, requireStudioPlan("shotList"));

router.get("/:projectId", getShotList);
router.post("/:projectId/shots", addShot);
router.patch("/shots/:id", updateShot);
router.delete("/shots/:id", deleteShot);
router.put("/:projectId/reorder", reorderShots);

export default router;
