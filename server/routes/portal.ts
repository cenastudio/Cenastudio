import { Router } from "express";
import { authenticateClientPortal } from "../middleware/authenticateClientPortal.js";
import {
  downloadFile,
  getFinancialSummary,
  getProject,
  listFiles,
  listMeetings,
  listProjects,
  listProposals,
} from "../controllers/portalController.js";

const router = Router();

// Todas as rotas do hub do cliente exigem sessão do portal (nunca a sessão da produtora).
router.use(authenticateClientPortal);

router.get("/projects", listProjects);
router.get("/projects/:id", getProject);
router.get("/files", listFiles);
router.get("/files/:id/download", downloadFile);
router.get("/proposals", listProposals);
router.get("/meetings", listMeetings);
router.get("/financial-summary", getFinancialSummary);

export default router;
