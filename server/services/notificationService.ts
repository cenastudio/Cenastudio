import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

/**
 * Cria uma notificação para um usuário específico.
 * Fire-and-forget: erros são logados mas não interrompem o fluxo do caller.
 */
export function notifyUser(
  userId: number,
  title: string,
  message: string,
  type: string = "info",
  link?: string,
): void {
  void createNotification(userId, title, message, type, link).catch((error) => {
    console.error("Erro ao criar notificação para usuário:", error);
  });
}

/**
 * Cria uma notificação para todos os usuários com role 'admin'.
 * Fire-and-forget: erros são logados mas não interrompem o fluxo do caller.
 */
export function notifyAdmins(
  title: string,
  message: string,
  type: string = "info",
  link?: string,
): void {
  void notifyAdminsAsync(title, message, type, link).catch((error) => {
    console.error("Erro ao criar notificação para admins:", error);
  });
}

async function createNotification(
  userId: number,
  title: string,
  message: string,
  type: string,
  link?: string,
): Promise<void> {
  if (shouldUsePrisma) {
    await prisma.notification.create({
      data: {
        userId: BigInt(userId),
        title,
        message,
        type,
        link: link ?? null,
      },
    });
    return;
  }

  db.prepare(
    "INSERT INTO notifications (user_id, title, message, type, link, read, created_at) VALUES (?, ?, ?, ?, ?, 0, datetime('now'))",
  ).run(userId, title, message, type, link ?? null);
}

async function notifyAdminsAsync(
  title: string,
  message: string,
  type: string,
  link?: string,
): Promise<void> {
  if (shouldUsePrisma) {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });
    await Promise.all(admins.map((admin) => createNotification(Number(admin.id), title, message, type, link)));
    return;
  }

  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as Array<{ id: number }>;
  for (const admin of admins) {
    await createNotification(admin.id, title, message, type, link);
  }
}
