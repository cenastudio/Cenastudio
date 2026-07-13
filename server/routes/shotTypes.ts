import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { listShotTypes, createShotType, deleteShotType } from "../controllers/shotTypesController.js";

const router = Router();

router.use(authenticate);

router.get("/", listShotTypes);
router.post("/", createShotType);
router.delete("/:id", deleteShotType);

export default router;
