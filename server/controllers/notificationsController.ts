import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbCountByCount } from "../models/types.js";

export const listNotifications: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const notifications = db
      .prepare(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .all(userId, limit);

    res.json({ success: true, data: notifications });
  } catch (e) {
    next(e);
  }
};

export const markAsRead: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);

    if (!id) throw new AppError("Notification ID is required", 400);

    const result = db
      .prepare(
        "UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?",
      )
      .run(id, userId);

    if (result.changes === 0) {
      throw new AppError("Notification not found", 404);
    }

    res.json({ success: true, data: { id } });
  } catch (e) {
    next(e);
  }
};

export const markAllAsRead: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;

    db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(
      userId,
    );

    res.json({ success: true, data: { message: "All notifications marked as read" } });
  } catch (e) {
    next(e);
  }
};

export const clearReadNotifications: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;

    const result = db
      .prepare("DELETE FROM notifications WHERE user_id = ? AND read = 1")
      .run(userId);

    res.json({ success: true, data: { removed: result.changes } });
  } catch (e) {
    next(e);
  }
};

export const clearAllNotifications: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;

    const result = db
      .prepare("DELETE FROM notifications WHERE user_id = ?")
      .run(userId);

    res.json({ success: true, data: { removed: result.changes } });
  } catch (e) {
    next(e);
  }
};

export const getUnreadCount: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;

    const result = db
      .prepare(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0",
      )
      .get(userId) as DbCountByCount;

    res.json({ success: true, data: { count: result.count } });
  } catch (e) {
    next(e);
  }
};
