import { Router } from "express";
import { authenticateClientPortal } from "../middleware/authenticateClientPortal.js";
import { activate, changePassword, login, logout, me } from "../controllers/portalAuthController.js";

const router = Router();

router.post("/login", login);
router.post("/activate", activate);
router.post("/logout", logout);
router.get("/me", authenticateClientPortal, me);
router.post("/change-password", authenticateClientPortal, changePassword);

export default router;
