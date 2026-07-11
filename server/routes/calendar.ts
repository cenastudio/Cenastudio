import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { exportProjectSchedule } from "../controllers/calendarController.js";

const router = Router();

router.use(authenticate);

router.get("/project/:projectId.ics", exportProjectSchedule);

export default router;
