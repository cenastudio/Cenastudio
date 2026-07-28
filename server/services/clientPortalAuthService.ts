import bcrypt from "bcryptjs";
import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { assertClientPortalCapacity } from "./entitlementService.js";

/**
 * Portal do Cliente (spec: portal-do-cliente) — auth do cliente final.
 *
 * `ClientPortalAccess` é 1:1 com `Client`, mecanismo de login totalmente
 * separado de `User`/`authService`. O dono da produtora cria/gerencia o
 * acesso (senha manual); o cliente pode trocar a senha depois.
 */

export interface ClientPortalAccessRecord {
  id: number;
  clientId: number;
  userId: number; // dono da produtora — resolvido via join com clients, não é coluna própria
  email: string;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Verifies the client belongs to userId, throwing 404 otherwise (ownership check). */
async function assertClientOwnership(userId: number, clientId: number): Promise<void> {
  if (shouldUsePrisma) {
    const client = await prisma.client.findFirst({
      where: { id: BigInt(clientId), userId: BigInt(userId) },
      select: { id: true },
    });
    if (!client) throw new AppError("Cliente não encontrado", 404);
    return;
  }

  const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(clientId, userId);
  if (!client) throw new AppError("Cliente não encontrado", 404);
}

function toRecord(raw: any): ClientPortalAccessRecord {
  return {
    id: Number(raw.id),
    clientId: Number(raw.clientId ?? raw.client_id),
    userId: Number(raw.userId ?? raw.user_id),
    email: raw.email,
    active: Boolean(raw.active),
    lastLoginAt: raw.lastLoginAt ?? (raw.last_login_at ? new Date(raw.last_login_at) : null),
    createdAt: raw.createdAt ?? new Date(raw.created_at),
    updatedAt: raw.updatedAt ?? new Date(raw.updated_at),
  };
}

/** Status do acesso ao portal para um cliente (null se nunca criado). */
export async function getAccessStatus(userId: number, clientId: number): Promise<ClientPortalAccessRecord | null> {
  await assertClientOwnership(userId, clientId);

  if (shouldUsePrisma) {
    const row = await prisma.clientPortalAccess.findUnique({ where: { clientId: BigInt(clientId) } });
    return row ? toRecord({ ...row, userId }) : null;
  }

  const row = db.prepare("SELECT * FROM client_portal_access WHERE client_id = ?").get(clientId) as any;
  return row ? toRecord({ ...row, user_id: userId }) : null;
}

/** Cria o acesso ao portal para um cliente. Falha se já existir ou se o limite do plano foi atingido. */
export async function createAccess(
  userId: number,
  clientId: number,
  email: string,
  password: string,
): Promise<ClientPortalAccessRecord> {
  await assertClientOwnership(userId, clientId);
  await assertClientPortalCapacity(userId);

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new AppError("Email inválido", 400);
  }
  if (!password || password.length < 6) {
    throw new AppError("A senha deve ter pelo menos 6 caracteres", 400);
  }

  const existing = await getAccessStatus(userId, clientId);
  if (existing) throw new AppError("Este cliente já tem acesso ao portal", 409);

  const passwordHash = hashPassword(password);

  if (shouldUsePrisma) {
    const emailTaken = await prisma.clientPortalAccess.findUnique({ where: { email: normalizedEmail } });
    if (emailTaken) throw new AppError("Este email já está em uso por outro acesso de portal", 409);

    const created = await prisma.clientPortalAccess.create({
      data: { clientId: BigInt(clientId), email: normalizedEmail, passwordHash, active: true },
    });
    return toRecord({ ...created, userId });
  }

  const emailTaken = db.prepare("SELECT id FROM client_portal_access WHERE email = ?").get(normalizedEmail);
  if (emailTaken) throw new AppError("Este email já está em uso por outro acesso de portal", 409);

  const result = db
    .prepare(
      `INSERT INTO client_portal_access (client_id, email, password_hash, active, created_at, updated_at)
       VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))`,
    )
    .run(clientId, normalizedEmail, passwordHash);
  const created = db.prepare("SELECT * FROM client_portal_access WHERE id = ?").get((result as any).lastInsertRowid);
  return toRecord({ ...(created as any), user_id: userId });
}

/** Ativa/desativa o acesso. Bump de updatedAt invalida sessões emitidas antes da mudança. */
export async function setActive(userId: number, clientId: number, active: boolean): Promise<ClientPortalAccessRecord> {
  await assertClientOwnership(userId, clientId);
  const existing = await getAccessStatus(userId, clientId);
  if (!existing) throw new AppError("Este cliente ainda não tem acesso ao portal", 404);

  if (active) await assertClientPortalCapacity(userId);

  if (shouldUsePrisma) {
    const updated = await prisma.clientPortalAccess.update({
      where: { clientId: BigInt(clientId) },
      data: { active, updatedAt: new Date() },
    });
    return toRecord({ ...updated, userId });
  }

  db.prepare("UPDATE client_portal_access SET active = ?, updated_at = datetime('now') WHERE client_id = ?").run(
    active ? 1 : 0,
    clientId,
  );
  const updated = db.prepare("SELECT * FROM client_portal_access WHERE client_id = ?").get(clientId);
  return toRecord({ ...(updated as any), user_id: userId });
}

/** Dono da produtora redefine a senha manualmente. Invalida sessões anteriores (bump de updatedAt). */
export async function resetPassword(userId: number, clientId: number, newPassword: string): Promise<void> {
  await assertClientOwnership(userId, clientId);
  const existing = await getAccessStatus(userId, clientId);
  if (!existing) throw new AppError("Este cliente ainda não tem acesso ao portal", 404);
  if (!newPassword || newPassword.length < 6) {
    throw new AppError("A senha deve ter pelo menos 6 caracteres", 400);
  }

  const passwordHash = hashPassword(newPassword);

  if (shouldUsePrisma) {
    await prisma.clientPortalAccess.update({
      where: { clientId: BigInt(clientId) },
      data: { passwordHash, updatedAt: new Date() },
    });
    return;
  }

  db.prepare("UPDATE client_portal_access SET password_hash = ?, updated_at = datetime('now') WHERE client_id = ?").run(
    passwordHash,
    clientId,
  );
}

/** Login do cliente. Erro 401 genérico tanto para credenciais erradas quanto para acesso inativo. */
export async function login(email: string, password: string): Promise<{ clientId: number; userId: number }> {
  const normalizedEmail = normalizeEmail(email);

  if (shouldUsePrisma) {
    const row = await prisma.clientPortalAccess.findUnique({
      where: { email: normalizedEmail },
      include: { client: { select: { userId: true } } },
    });
    if (!row || !row.active || !bcrypt.compareSync(password, row.passwordHash)) {
      throw new AppError("Email ou senha inválidos", 401);
    }
    await prisma.clientPortalAccess.update({
      where: { id: row.id },
      data: { lastLoginAt: new Date() },
    });
    return { clientId: Number(row.clientId), userId: Number(row.client.userId) };
  }

  const row = db
    .prepare(
      `SELECT cpa.*, c.user_id AS owner_user_id
       FROM client_portal_access cpa
       JOIN clients c ON c.id = cpa.client_id
       WHERE cpa.email = ?`,
    )
    .get(normalizedEmail) as any;
  if (!row || !row.active || !bcrypt.compareSync(password, row.password_hash)) {
    throw new AppError("Email ou senha inválidos", 401);
  }
  db.prepare("UPDATE client_portal_access SET last_login_at = datetime('now') WHERE id = ?").run(row.id);
  return { clientId: Number(row.client_id), userId: Number(row.owner_user_id) };
}

/** Troca de senha pelo próprio cliente autenticado. Mantém a sessão atual válida (não faz bump de updatedAt para lastLoginAt-only ops, mas troca de senha invalida por design — ver nota). */
export async function changePassword(
  clientId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new AppError("A nova senha deve ter pelo menos 6 caracteres", 400);
  }

  if (shouldUsePrisma) {
    const row = await prisma.clientPortalAccess.findUnique({ where: { clientId: BigInt(clientId) } });
    if (!row) throw new AppError("Acesso não encontrado", 404);
    if (!bcrypt.compareSync(currentPassword, row.passwordHash)) {
      throw new AppError("Senha atual incorreta", 400);
    }
    await prisma.clientPortalAccess.update({
      where: { clientId: BigInt(clientId) },
      data: { passwordHash: hashPassword(newPassword) },
    });
    return;
  }

  const row = db.prepare("SELECT * FROM client_portal_access WHERE client_id = ?").get(clientId) as any;
  if (!row) throw new AppError("Acesso não encontrado", 404);
  if (!bcrypt.compareSync(currentPassword, row.password_hash)) {
    throw new AppError("Senha atual incorreta", 400);
  }
  db.prepare("UPDATE client_portal_access SET password_hash = ? WHERE client_id = ?").run(
    hashPassword(newPassword),
    clientId,
  );
}

/** Usado pelo middleware `authenticateClientPortal` — inclui updatedAt para checagem de invalidação de sessão. */
export async function getActiveAccessByClientId(
  clientId: number,
): Promise<{ active: boolean; userId: number; updatedAt: Date } | null> {
  if (shouldUsePrisma) {
    const row = await prisma.clientPortalAccess.findUnique({
      where: { clientId: BigInt(clientId) },
      include: { client: { select: { userId: true } } },
    });
    if (!row) return null;
    return { active: row.active, userId: Number(row.client.userId), updatedAt: row.updatedAt };
  }

  const row = db
    .prepare(
      `SELECT cpa.active, cpa.updated_at, c.user_id AS owner_user_id
       FROM client_portal_access cpa
       JOIN clients c ON c.id = cpa.client_id
       WHERE cpa.client_id = ?`,
    )
    .get(clientId) as any;
  if (!row) return null;
  return { active: Boolean(row.active), userId: Number(row.owner_user_id), updatedAt: new Date(row.updated_at) };
}
