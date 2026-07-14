import { Router } from "express";
import * as checkoutController from "../controllers/checkoutController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.post("/session", authenticate, checkoutController.createSession);
router.post("/sync-session", authenticate, checkoutController.syncSession);
router.post("/portal", authenticate, checkoutController.createPortal);
router.get("/invoices", authenticate, checkoutController.getInvoices);

export default router;
