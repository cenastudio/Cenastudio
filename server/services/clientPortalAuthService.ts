import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { assertClientPortalCapacity } from "./entitlementService.js";
import { isEmailConfigured, sendEmail } from "./emailService.js";
import { renderTransactionalEmail, type TransactionalEmailLocale } from "./transactionalEmail.js";
import { SITE_CONFIG } from "@shared/site";
import { strongPasswordSchema } from "../schemas/auth.js";

/**
 * Portal do Cliente (spec: portal-do-cliente) — auth do cliente final.
 *
 * `ClientPortalAccess` é 1:1 com `Client`, mecanismo de login totalmente
 * separado de `User`/`authService`. O dono da produtora cria/gerencia o
 * acesso, mas o cliente final define a propria senha via token temporal.
 */

export interface ClientPortalAccessRecord {
  id: number;
  clientId: number;
  userId: number; // dono da produtora — resolvido via join com clients, não é coluna própria
  email: string;
  active: boolean;
  activationPending: boolean;
  activationTokenExpiresAt: Date | null;
  activationAcceptedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientPortalActivationResult {
  access: ClientPortalAccessRecord;
  activationUrl: string;
  activationEmailSent: boolean;
  activationExpiresAt: Date;
}

const ACTIVATION_TOKEN_HOURS = Math.max(1, Number(process.env.CLIENT_PORTAL_ACTIVATION_TOKEN_HOURS ?? 168));

function getClientOrigin() {
  return process.env.CLIENT_ORIGIN || "http://localhost:5173";
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function createActivationUrl(rawToken: string): string {
  return `${getClientOrigin()}/portal/activate?token=${encodeURIComponent(rawToken)}`;
}

function createActivationExpiry(): Date {
  return new Date(Date.now() + ACTIVATION_TOKEN_HOURS * 60 * 60 * 1000);
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function parseDbDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}Z`);
  }
  return new Date(String(value));
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
    activationPending: Boolean(raw.activationTokenHash ?? raw.activation_token_hash),
    activationTokenExpiresAt: raw.activationTokenExpiresAt ?? (raw.activation_token_expires_at ? parseDbDate(raw.activation_token_expires_at) : null),
    activationAcceptedAt: raw.activationAcceptedAt ?? (raw.activation_accepted_at ? parseDbDate(raw.activation_accepted_at) : null),
    lastLoginAt: raw.lastLoginAt ?? (raw.last_login_at ? parseDbDate(raw.last_login_at) : null),
    createdAt: raw.createdAt ?? parseDbDate(raw.created_at),
    updatedAt: raw.updatedAt ?? parseDbDate(raw.updated_at),
  };
}

function renderClientPortalActivationEmail(input: {
  locale: TransactionalEmailLocale;
  studioName: string;
  clientName: string;
  activationUrl: string;
  expiresAt: Date;
}) {
  const locale = input.locale === "en" ? "en" : "pt";
  const expiresAt = input.expiresAt.toLocaleString(locale === "en" ? "en-US" : "pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
  const rendered = renderTransactionalEmail({
    locale,
    eyebrow: locale === "en" ? "Client portal" : "Portal do cliente",
    title: locale === "en" ? "Create your portal password" : "Crie sua senha do portal",
    greeting: locale === "en" ? `Hi, ${input.clientName}.` : `Olá, ${input.clientName}.`,
    paragraphs: locale === "en"
      ? [
          `${input.studioName} enabled your secure client portal access.`,
          "Use the button below to create your password. The producer never receives or sets this password for you.",
        ]
      : [
          `${input.studioName} liberou seu acesso seguro ao portal do cliente.`,
          "Use o botão abaixo para criar sua senha. A produtora nunca recebe nem define essa senha por você.",
        ],
    details: [{ label: locale === "en" ? "Link validity" : "Validade do link", value: expiresAt }],
    action: { label: locale === "en" ? "Create portal password" : "Criar senha do portal", url: input.activationUrl },
    safetyNote: locale === "en"
      ? "If you were not expecting this access, ignore this email or contact the producer."
      : "Se você não esperava este acesso, ignore este e-mail ou fale com a produtora.",
  });
  return {
    subject: locale === "en" ? "Create your Cena Studio client portal password" : "Crie sua senha do Portal do Cliente",
    html: rendered.html,
    text: rendered.text,
  };
}

async function getOwnerLocaleAndStudio(userId: number): Promise<{ locale: TransactionalEmailLocale; studioName: string }> {
  if (shouldUsePrisma) {
    const [user, settings] = await Promise.all([
      prisma.user.findUnique({ where: { id: BigInt(userId) }, select: { name: true, regionalPrefs: true } }),
      prisma.studioSetting.findUnique({ where: { userId: BigInt(userId) }, select: { studioName: true } }),
    ]);
    return {
      locale: (user?.regionalPrefs as { locale?: string } | null)?.locale === "en" ? "en" : "pt",
      studioName: settings?.studioName || user?.name || SITE_CONFIG.brandName,
    };
  }

  const user = db.prepare("SELECT name, regional_prefs FROM users WHERE id = ?").get(userId) as any;
  let locale: TransactionalEmailLocale = "pt";
  try {
    locale = JSON.parse(user?.regional_prefs || "{}")?.locale === "en" ? "en" : "pt";
  } catch {
    locale = "pt";
  }
  return { locale, studioName: user?.name || SITE_CONFIG.brandName };
}

async function sendActivationEmail(input: {
  userId: number;
  clientName: string;
  email: string;
  activationUrl: string;
  expiresAt: Date;
}): Promise<boolean> {
  if (!isEmailConfigured) return false;
  const owner = await getOwnerLocaleAndStudio(input.userId);
  const rendered = renderClientPortalActivationEmail({
    locale: owner.locale,
    studioName: owner.studioName,
    clientName: input.clientName,
    activationUrl: input.activationUrl,
    expiresAt: input.expiresAt,
  });
  await sendEmail({
    to: input.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
  return true;
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
  password?: string,
): Promise<ClientPortalAccessRecord | ClientPortalActivationResult> {
  await assertClientOwnership(userId, clientId);
  await assertClientPortalCapacity(userId);

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new AppError("Email inválido", 400);
  }
  if (password !== undefined && password.length < 6) {
    throw new AppError("A senha deve ter pelo menos 6 caracteres", 400);
  }

  const existing = await getAccessStatus(userId, clientId);
  if (existing) throw new AppError("Este cliente já tem acesso ao portal", 409);

  const rawToken = password === undefined ? createRawToken() : null;
  const activationExpiresAt = rawToken ? createActivationExpiry() : null;
  const passwordHash = hashPassword(password ?? createRawToken());

  if (shouldUsePrisma) {
    const emailTaken = await prisma.clientPortalAccess.findUnique({ where: { email: normalizedEmail } });
    if (emailTaken) throw new AppError("Este email já está em uso por outro acesso de portal", 409);
    const client = await prisma.client.findUnique({ where: { id: BigInt(clientId) }, select: { name: true } });

    const created = await prisma.clientPortalAccess.create({
      data: {
        clientId: BigInt(clientId),
        email: normalizedEmail,
        passwordHash,
        active: true,
        activationTokenHash: rawToken ? hashToken(rawToken) : null,
        activationTokenExpiresAt: activationExpiresAt,
        activationAcceptedAt: rawToken ? null : new Date(),
      },
    });
    const access = toRecord({ ...created, userId });
    if (!rawToken || !activationExpiresAt) return access;
    const activationUrl = createActivationUrl(rawToken);
    const activationEmailSent = await sendActivationEmail({
      userId,
      clientName: client?.name || normalizedEmail,
      email: normalizedEmail,
      activationUrl,
      expiresAt: activationExpiresAt,
    });
    return { access, activationUrl, activationEmailSent, activationExpiresAt };
  }

  const emailTaken = db.prepare("SELECT id FROM client_portal_access WHERE email = ?").get(normalizedEmail);
  if (emailTaken) throw new AppError("Este email já está em uso por outro acesso de portal", 409);
  const client = db.prepare("SELECT name FROM clients WHERE id = ?").get(clientId) as { name?: string } | undefined;

  const result = db
    .prepare(
      `INSERT INTO client_portal_access (
        client_id, email, password_hash, active, activation_token_hash,
        activation_token_expires_at, activation_accepted_at, created_at, updated_at
       )
       VALUES (?, ?, ?, 1, ?, ?, ?, datetime('now'), datetime('now'))`,
    )
    .run(
      clientId,
      normalizedEmail,
      passwordHash,
      rawToken ? hashToken(rawToken) : null,
      activationExpiresAt?.toISOString() ?? null,
      rawToken ? null : new Date().toISOString(),
    );
  const created = db.prepare("SELECT * FROM client_portal_access WHERE id = ?").get((result as any).lastInsertRowid);
  const access = toRecord({ ...(created as any), user_id: userId });
  if (!rawToken || !activationExpiresAt) return access;
  const activationUrl = createActivationUrl(rawToken);
  const activationEmailSent = await sendActivationEmail({
    userId,
    clientName: client?.name || normalizedEmail,
    email: normalizedEmail,
    activationUrl,
    expiresAt: activationExpiresAt,
  });
  return { access, activationUrl, activationEmailSent, activationExpiresAt };
}

export async function issueActivationLink(userId: number, clientId: number): Promise<ClientPortalActivationResult> {
  await assertClientOwnership(userId, clientId);
  const existing = await getAccessStatus(userId, clientId);
  if (!existing) throw new AppError("Este cliente ainda não tem acesso ao portal", 404);

  const rawToken = createRawToken();
  const activationExpiresAt = createActivationExpiry();
  const activationTokenHash = hashToken(rawToken);
  const activationUrl = createActivationUrl(rawToken);

  if (shouldUsePrisma) {
    const updated = await prisma.clientPortalAccess.update({
      where: { clientId: BigInt(clientId) },
      data: { activationTokenHash, activationTokenExpiresAt: activationExpiresAt, updatedAt: new Date() },
      include: { client: { select: { name: true } } },
    });
    const activationEmailSent = await sendActivationEmail({
      userId,
      clientName: updated.client.name,
      email: updated.email,
      activationUrl,
      expiresAt: activationExpiresAt,
    });
    return { access: toRecord({ ...updated, userId }), activationUrl, activationEmailSent, activationExpiresAt };
  }

  db.prepare(
    `UPDATE client_portal_access
     SET activation_token_hash = ?, activation_token_expires_at = ?, updated_at = datetime('now')
     WHERE client_id = ?`,
  ).run(activationTokenHash, activationExpiresAt.toISOString(), clientId);
  const updated = db
    .prepare(
      `SELECT cpa.*, c.name AS client_name
       FROM client_portal_access cpa
       JOIN clients c ON c.id = cpa.client_id
       WHERE cpa.client_id = ?`,
    )
    .get(clientId) as any;
  const activationEmailSent = await sendActivationEmail({
    userId,
    clientName: updated.client_name,
    email: updated.email,
    activationUrl,
    expiresAt: activationExpiresAt,
  });
  return { access: toRecord({ ...updated, user_id: userId }), activationUrl, activationEmailSent, activationExpiresAt };
}

export async function activateWithToken(token: string, password: string): Promise<{ clientId: number; userId: number }> {
  if (!token?.trim()) throw new AppError("Token inválido ou expirado", 400);
  const passwordValidation = strongPasswordSchema.safeParse(password);
  if (!passwordValidation.success) throw new AppError("A senha deve cumprir a política de segurança", 400);
  const tokenHash = hashToken(token);
  const now = new Date();

  if (shouldUsePrisma) {
    const row = await prisma.clientPortalAccess.findUnique({
      where: { activationTokenHash: tokenHash },
      include: { client: { select: { userId: true } } },
    });
    if (!row || !row.activationTokenExpiresAt || row.activationTokenExpiresAt.getTime() < now.getTime()) {
      throw new AppError("Token inválido ou expirado", 400);
    }
    await prisma.clientPortalAccess.update({
      where: { id: row.id },
      data: {
        passwordHash: hashPassword(password),
        active: true,
        activationTokenHash: null,
        activationTokenExpiresAt: null,
        activationAcceptedAt: now,
        updatedAt: now,
      },
    });
    return { clientId: Number(row.clientId), userId: Number(row.client.userId) };
  }

  const row = db
    .prepare(
      `SELECT cpa.*, c.user_id AS owner_user_id
       FROM client_portal_access cpa
       JOIN clients c ON c.id = cpa.client_id
       WHERE cpa.activation_token_hash = ?`,
    )
    .get(tokenHash) as any;
  if (!row || !row.activation_token_expires_at || parseDbDate(row.activation_token_expires_at).getTime() < now.getTime()) {
    throw new AppError("Token inválido ou expirado", 400);
  }
  db.prepare(
    `UPDATE client_portal_access
     SET password_hash = ?, active = 1, activation_token_hash = NULL,
         activation_token_expires_at = NULL, activation_accepted_at = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(hashPassword(password), now.toISOString(), row.id);
  return { clientId: Number(row.client_id), userId: Number(row.owner_user_id) };
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
  return { active: Boolean(row.active), userId: Number(row.owner_user_id), updatedAt: parseDbDate(row.updated_at) };
}
