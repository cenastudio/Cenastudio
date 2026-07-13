import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  listShotTypes,
  addShotType,
  deleteShotType,
} from "../controllers/shotTypeController.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get("/", listShotTypes);
router.post("/", addShotType);
router.delete("/:id", deleteShotType);

export default router;
