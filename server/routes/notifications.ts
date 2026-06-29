import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as notificationsController from "../controllers/notificationsController.js";

const router = Router();

router.use(authenticate);

router.get("/", notificationsController.listNotifications);
router.put("/read-all", notificationsController.markAllAsRead);
router.delete("/all", notificationsController.clearAllNotifications);
router.delete("/read", notificationsController.clearReadNotifications);
router.put("/:id/read", notificationsController.markAsRead);
router.get("/unread-count", notificationsController.getUnreadCount);

export default router;
