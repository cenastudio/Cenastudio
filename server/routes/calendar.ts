import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan, requireStudioPlan } from "../middleware/planAccess.js";
import {
  createGoogleAuthUrl,
  exportProjectSchedule,
  getGoogleStatus,
  handleGoogleCallback,
  revokeGoogleCalendar,
  syncProjectSchedule,
} from "../controllers/calendarController.js";

const router = Router();

router.get("/google/callback", handleGoogleCallback);

// Calendar (.ics) export is advertised as a Studio+ feature (shared/site.ts PRICING).
router.use(authenticate, requireOperationalPlan, requireStudioPlan("calendarExport"));

router.get("/project/:projectId.ics", exportProjectSchedule);
router.post("/export/:projectId", exportProjectSchedule);
router.get("/google/status", getGoogleStatus);
router.post("/google/auth", createGoogleAuthUrl);
router.post("/google/sync/:projectId", syncProjectSchedule);
router.delete("/google/revoke", revokeGoogleCalendar);

export default router;
