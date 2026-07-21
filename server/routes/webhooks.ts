import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan, requireStudioPlan } from "../middleware/planAccess.js";
import {
  listEvents,
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  listDeliveries,
  testWebhook,
} from "../controllers/webhooksController.js";

const router = Router();

// Webhooks are advertised as a Studio+ feature (shared/site.ts PRICING).
router.use(authenticate, requireOperationalPlan, requireStudioPlan("webhooks"));
router.get("/events", listEvents);
router.get("/", listWebhooks);
router.post("/", createWebhook);
router.patch("/:id", updateWebhook);
router.delete("/:id", deleteWebhook);
router.get("/:id/deliveries", listDeliveries);
router.post("/:id/test", testWebhook);

export default router;
