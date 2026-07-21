import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan, requireStudioPlan } from "../middleware/planAccess.js";
import { exportProjectSchedule } from "../controllers/calendarController.js";

const router = Router();

// Calendar (.ics) export is advertised as a Studio+ feature (shared/site.ts PRICING).
router.use(authenticate, requireOperationalPlan, requireStudioPlan("calendarExport"));

router.get("/project/:projectId.ics", exportProjectSchedule);

export default router;
