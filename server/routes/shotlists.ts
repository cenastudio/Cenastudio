import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireStudioPlan } from "../middleware/planAccess.js";
import {
  approveFrame,
  deleteFrame as deleteStoryboardFrame,
  generateFrame,
  listFrames,
} from "../controllers/shotStoryboardController.js";
import {
  getShotList,
  addShot,
  updateShot,
  deleteShot,
  reorderShots,
  uploadThumbnail,
  duplicateShot,
  exportPdf,
} from "../controllers/shotListController.js";

const router = Router();

router.use(authenticate, requireStudioPlan("shotList"));

router.get("/shots/:id/storyboard", listFrames);
router.post("/shots/:id/storyboard/generate", generateFrame);
router.post("/storyboard/:frameId/approve", approveFrame);
router.delete("/storyboard/:frameId", deleteStoryboardFrame);
router.get("/:projectId", getShotList);
router.get("/:projectId/export/pdf", exportPdf);
router.post("/:projectId/shots", addShot);
router.post("/shots/:id/thumbnail", uploadThumbnail);
router.post("/shots/:id/duplicate", duplicateShot);
router.patch("/shots/:id", updateShot);
router.delete("/shots/:id", deleteShot);
router.put("/:projectId/reorder", reorderShots);

export default router;
