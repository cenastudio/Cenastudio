import { Router } from "express";
import { getStudioSettings, updateStudioSettings } from "../controllers/studioSettingsController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.get("/", authenticate, getStudioSettings);
router.put("/", authenticate, updateStudioSettings);

export default router;
