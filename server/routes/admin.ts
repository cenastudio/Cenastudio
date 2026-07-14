import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validate.js";
import { createManagedUserSchema, createToolSchema, updateToolSchema } from "../schemas/admin.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/tools", adminController.listTools);
router.post("/tools", validateBody(createToolSchema), adminController.createTool);
router.put("/tools/:id", validateBody(updateToolSchema), adminController.updateTool);
router.delete("/tools/:id", adminController.deleteTool);
router.get("/metrics", adminController.getMetrics);
router.get("/audit-log", adminController.getAuditLog);
router.get("/lgpd-requests", adminController.listLgpdRequests);
router.put("/lgpd-requests/:id", adminController.processLgpdRequest);
router.get("/referrals", adminController.getReferralOverview);
router.get("/ai-usage", adminController.getAiUsage);
router.post("/broadcast", adminController.broadcastAnnouncement);
router.get("/users", adminController.listUsers);
router.post("/users", validateBody(createManagedUserSchema), adminController.createManagedUser);
router.get("/users/:id", adminController.getUserDetail);
router.put("/users/:id/role", adminController.updateUserRole);
router.put("/users/:id/plan", adminController.updateUserPlan);
router.put("/users/:id/status", adminController.setUserDisabled);
router.put("/users/:id/subscription", adminController.updateUserSubscription);
router.post("/users/:id/reset-password", adminController.resetUserPassword);
router.delete("/users/:id", adminController.deleteManagedUser);

export default router;
