import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { listSessions, revokeSession, revokeOtherSessions } from "../controllers/sessionsController.js";

const router = Router();

router.use(authenticate);
router.get("/", listSessions);
router.post("/revoke-others", revokeOtherSessions);
router.delete("/:id", revokeSession);

export default router;
