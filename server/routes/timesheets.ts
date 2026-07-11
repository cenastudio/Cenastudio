import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireStudioPlan } from "../middleware/planAccess.js";
import {
  listEntries,
  getRunningTimer,
  startTimer,
  stopTimer,
  addManualEntry,
  deleteEntry,
  getReport,
} from "../controllers/timesheetController.js";

const router = Router();

router.use(authenticate, requireStudioPlan("timesheet"));

router.get("/", listEntries);
router.get("/running", getRunningTimer);
router.post("/start", startTimer);
router.post("/:id/stop", stopTimer);
router.post("/", addManualEntry);
router.delete("/:id", deleteEntry);
router.get("/report", getReport);

export default router;
