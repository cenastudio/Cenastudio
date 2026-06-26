import { db } from "../models/db.js";

type NotificationType = "info" | "success" | "warning" | "error" | "user" | "client";

export function notifyUser(
  userId: number,
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
) {
  db.prepare(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(userId, title, message, type, link || null);
}

export function notifyAdmins(
  title: string,
  message: string,
  type: NotificationType = "info",
  link = "/admin/gerenciar",
) {
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as Array<{ id: number }>;
  for (const admin of admins) {
    notifyUser(admin.id, title, message, type, link);
  }
}
