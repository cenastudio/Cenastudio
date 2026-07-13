import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";

export async function listShotTypes(userId: number) {
  return await db.shotType.findMany({
    where: { userId },
    orderBy: [
      { isDefault: "desc" }, // Default types first
      { name: "asc" },
    ],
  });
}

export async function createShotType(userId: number, name: string) {
  // Check for duplicate name for this user
  const existing = await db.shotType.findFirst({
    where: { userId, name },
  });

  if (existing) {
    throw new AppError("Tipo de shot com esse nome já existe", 400);
  }

  return await db.shotType.create({
    data: {
      userId,
      name,
      isDefault: false,
    },
  });
}

export async function deleteShotType(userId: number, typeId: number) {
  const type = await db.shotType.findFirst({
    where: { id: typeId, userId },
  });

  if (!type) {
    throw new AppError("Tipo de shot não encontrado", 404);
  }

  if (type.isDefault) {
    throw new AppError("Tipos padrão não podem ser removidos", 400);
  }

  await db.shotType.delete({
    where: { id: typeId },
  });
}
