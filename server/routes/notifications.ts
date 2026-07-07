import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearReadNotifications,
  clearAllNotifications,
} from "../controllers/notificationsController.js";

const router = Router();

router.use(authenticate);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/:id/read", markAsRead);
router.put("/read-all", markAllAsRead);
router.delete("/read", clearReadNotifications);
router.delete("/all", clearAllNotifications);

export default router;
