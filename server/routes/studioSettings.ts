import { Router } from "express";
import { getStudioSettings, updateStudioSettings, uploadStudioLogo } from "../controllers/studioSettingsController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan, requireWhitelabel } from "../middleware/planAccess.js";

const router = Router();

router.use(authenticate, requireOperationalPlan);
router.get("/", getStudioSettings);
router.put("/", updateStudioSettings);
router.post("/logo", requireWhitelabel, uploadStudioLogo);

export default router;
