import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbCountByCount } from "../models/types.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";

export const listNotifications: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    if (shouldUsePrisma) {
      const notifications = await prisma.notification.findMany({
        where: { userId: BigInt(userId) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit,
      });
      res.json({ success: true, data: notifications.map((item) => withSnakeCase(item as any, { userId: "user_id", createdAt: "created_at" })) });
      return;
    }

    const notifications = db
      .prepare(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
      )
      .all(userId, limit);

    res.json({ success: true, data: notifications });
  } catch (e) {
    next(e);
  }
};

export const markAsRead: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);

    if (!id) throw new AppError("Notification ID is required", 400);
    if (shouldUsePrisma) {
      const result = await prisma.notification.updateMany({
        where: { id: BigInt(id), userId: BigInt(userId) }, data: { read: true },
      });
      if (result.count === 0) throw new AppError("Notification not found", 404);
      res.json({ success: true, data: { id } });
      return;
    }

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

export const markAllAsRead: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      await prisma.notification.updateMany({ where: { userId: BigInt(userId) }, data: { read: true } });
      res.json({ success: true, data: { message: "All notifications marked as read" } });
      return;
    }

    db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(
      userId,
    );

    res.json({ success: true, data: { message: "All notifications marked as read" } });
  } catch (e) {
    next(e);
  }
};

export const clearReadNotifications: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const result = await prisma.notification.deleteMany({ where: { userId: BigInt(userId), read: true } });
      res.json({ success: true, data: { removed: result.count } });
      return;
    }

    const result = db
      .prepare("DELETE FROM notifications WHERE user_id = ? AND read = 1")
      .run(userId);

    res.json({ success: true, data: { removed: result.changes } });
  } catch (e) {
    next(e);
  }
};

export const clearAllNotifications: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const result = await prisma.notification.deleteMany({ where: { userId: BigInt(userId) } });
      res.json({ success: true, data: { removed: result.count } });
      return;
    }

    const result = db
      .prepare("DELETE FROM notifications WHERE user_id = ?")
      .run(userId);

    res.json({ success: true, data: { removed: result.changes } });
  } catch (e) {
    next(e);
  }
};

export const getUnreadCount: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const count = await prisma.notification.count({ where: { userId: BigInt(userId), read: false } });
      res.json({ success: true, data: { count } });
      return;
    }

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
