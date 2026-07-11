import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan } from "../middleware/planAccess.js";
import { exportProjectSchedule } from "../controllers/calendarController.js";

const router = Router();

// Req 5: Pro+ (any operational/paid plan) — same gate used by files/webhooks/etc.
router.use(authenticate, requireOperationalPlan);

router.get("/project/:projectId.ics", exportProjectSchedule);

export default router;
