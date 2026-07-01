import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../models/db.js";
import type { AuthUser } from "../middleware/authenticate.js";
import { AppError } from "../middleware/errorHandler.js";
import { notifyAdmins } from "./notificationService.js";
import { logger } from "../utils/logger.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

interface DbUser {
  id: number;
  email: string;
  password_hash: string;
  role: "user" | "admin";
  name?: string | null;
}

interface SupabaseAdminUser {
  id?: string;
  email?: string;
}

interface SupabaseErrorDetail {
  message: string;
  code?: string;
  raw?: unknown;
}

export interface UserPlanRow {
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  plan_id: string;
  plan_name: string;
  generation_limit: number;
  features: string;
}

type PrismaUserWithProfile = {
  id: bigint;
  email: string;
  role: string;
  name: string | null;
  studioName?: string | null;
  studioRole?: string | null;
  phone?: string | null;
};

export interface FormattedUserPlan {
  planId: string;
  planName: string;
  status: string;
  generationLimit: number;
  trialEndsAt: string | null;
  features: string[];
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

function toAuthUser(row: PrismaUserWithProfile): AuthUser {
  return {
    id: Number(row.id),
    email: row.email,
    role: row.role === "admin" ? "admin" : "user",
    name: row.name ?? undefined,
    studioName: row.studioName ?? undefined,
    studioRole: row.studioRole ?? undefined,
    phone: row.phone ?? undefined,
  };
}

function toPlanRow(row: {
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  plan: { id: string; name: string; generationLimit: number; features: unknown };
}): UserPlanRow {
  return {
    status: row.status,
    trial_ends_at: row.trialEndsAt?.toISOString() ?? null,
    current_period_end: row.currentPeriodEnd?.toISOString() ?? null,
    plan_id: row.plan.id,
    plan_name: row.plan.name,
    generation_limit: row.plan.generationLimit,
    features: JSON.stringify(row.plan.features ?? []),
  };
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = new Set(
    ["admin@cenastudio.com.br", "admin@frame.ai", ...(process.env.ADMIN_EMAILS || "").split(",")]
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  return adminEmails.has(email.toLowerCase().trim());
}

export async function ensureUserSubscription(userId: number, planId: string, status = "active") {
  if (shouldUsePrisma) {
    const existing = await prisma.subscription.findFirst({ where: { userId: BigInt(userId) } });
    if (!existing) {
      await prisma.subscription.create({
        data: {
          userId: BigInt(userId),
          planId,
          status,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
    return;
  }

  const existing = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").get(userId);
  if (!existing) {
    db.prepare(
      `INSERT INTO subscriptions (user_id, plan_id, status, current_period_end)
       VALUES (?, ?, ?, datetime('now', '+1 month'))`,
    ).run(userId, planId, status);
  }
}

async function createTrialSubscription(userId: number) {
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  if (shouldUsePrisma) {
    await prisma.subscription.create({
      data: {
        userId: BigInt(userId),
        planId: "pro",
        status: "trial",
        trialEndsAt: new Date(trialEnd),
        currentPeriodEnd: new Date(trialEnd),
      },
    });
    return;
  }

  db.prepare(
    "INSERT INTO subscriptions (user_id, plan_id, status, trial_ends_at, current_period_end) VALUES (?, ?, ?, ?, ?)",
  ).run(userId, "pro", "trial", trialEnd, trialEnd);
}

async function readSupabaseError(response: Response): Promise<SupabaseErrorDetail> {
  const text = await response.text().catch(() => "");
  let raw: unknown = text;

  if (text) {
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      raw = text;
    }
  }

  const detail = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const message =
    detail.message ||
    detail.msg ||
    detail.error_description ||
    detail.error ||
    (typeof raw === "string" ? raw : "") ||
    "Nao foi possivel criar o acesso no Supabase.";

  return {
    message: String(message),
    code: detail.code ? String(detail.code) : undefined,
    raw,
  };
}

function isSupabaseUserConflict(status: number, detail: SupabaseErrorDetail) {
  const value = `${detail.code || ""} ${detail.message}`.toLowerCase();
  return (
    status === 409 ||
    status === 422 ||
    value.includes("already") ||
    value.includes("exists") ||
    value.includes("registered")
  );
}

function supabaseHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function findSupabaseUserByEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string,
): Promise<SupabaseAdminUser | null> {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: supabaseHeaders(serviceRoleKey),
  });

  if (!response.ok) {
    const detail = await readSupabaseError(response);
    logger.warn(
      { status: response.status, code: detail.code, error: detail.message },
      "Could not list Supabase users while reconciling managed access",
    );
    return null;
  }

  const payload = await response.json().catch(() => ({})) as { users?: SupabaseAdminUser[] } | SupabaseAdminUser[];
  const users = Array.isArray(payload) ? payload : payload.users || [];
  return users.find((user) => user.email?.toLowerCase() === email) || null;
}

async function updateSupabaseManagedUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  supabaseId: string,
  data: { name: string; password: string; role: string; planId: string },
) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${supabaseId}`, {
    method: "PUT",
    headers: supabaseHeaders(serviceRoleKey),
    body: JSON.stringify({
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
      app_metadata: { role: data.role, plan_id: data.planId },
    }),
  });

  if (!response.ok) {
    const detail = await readSupabaseError(response);
    logger.warn(
      { status: response.status, code: detail.code, error: detail.message },
      "Could not update existing Supabase managed user",
    );
    throw new AppError(detail.message, response.status === 422 ? 409 : 502);
  }
}

async function createSupabaseManagedUser(
  supabaseUrl: string,
  serviceRoleKey: string,
  data: { name: string; email: string; password: string; role: string; planId: string },
): Promise<SupabaseAdminUser> {
  const supabaseResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: supabaseHeaders(serviceRoleKey),
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
      app_metadata: { role: data.role, plan_id: data.planId },
    }),
  });

  if (supabaseResponse.ok) {
    return await supabaseResponse.json() as SupabaseAdminUser;
  }

  const detail = await readSupabaseError(supabaseResponse);
  logger.warn(
    { status: supabaseResponse.status, code: detail.code, error: detail.message },
    "Could not create Supabase managed user",
  );

  if (isSupabaseUserConflict(supabaseResponse.status, detail)) {
    const existing = await findSupabaseUserByEmail(supabaseUrl, serviceRoleKey, data.email);
    if (existing?.id) {
      await updateSupabaseManagedUser(supabaseUrl, serviceRoleKey, existing.id, data);
      return existing;
    }
  }

  throw new AppError(detail.message, supabaseResponse.status === 422 ? 409 : 502);
}

export function formatUserPlan(row: UserPlanRow | undefined): FormattedUserPlan | null {
  if (!row) return null;
  let features: string[] = [];
  try {
    features = JSON.parse(row.features) as string[];
  } catch {
    features = [];
  }
  return {
    planId: row.plan_id,
    planName: row.plan_name,
    status: row.status,
    generationLimit: row.generation_limit,
    trialEndsAt: row.trial_ends_at,
    features,
  };
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const normalized = email.toLowerCase().trim();
  if (shouldUsePrisma) {
    const row = await prisma.user.findUnique({ where: { email: normalized } });
    if (!row || !bcrypt.compareSync(password, row.passwordHash)) {
      throw new AppError("Invalid email or password", 401);
    }
    return toAuthUser(row);
  }

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(normalized) as
    | DbUser
    | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw new AppError("Invalid email or password", 401);
  }
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name ?? undefined,
  };
}

export async function getUserById(id: number): Promise<AuthUser | null> {
  if (shouldUsePrisma) {
    const row = await prisma.user.findUnique({ where: { id: BigInt(id) } });
    return row ? toAuthUser(row) : null;
  }

  const row = db
    .prepare(
      `SELECT id, email, role, name,
              studio_name as studioName,
              studio_role as studioRole,
              phone
       FROM users WHERE id = ?`,
    )
    .get(id) as AuthUser | undefined;
  return row ?? null;
}

export async function ensureUserFromToken(tokenUser: AuthUser): Promise<AuthUser> {
  const existing = await getUserById(tokenUser.id);
  if (existing) return existing;

  const normalized = tokenUser.email.toLowerCase().trim();
  const role = tokenUser.role === "admin" || isAdminEmail(normalized) ? "admin" : "user";
  const hash = hashPassword(crypto.randomBytes(24).toString("hex"));

  if (shouldUsePrisma) {
    const user = await prisma.user.upsert({
      where: { id: BigInt(tokenUser.id) },
      update: {},
      create: {
        id: BigInt(tokenUser.id),
        name: tokenUser.name || normalized.split("@")[0],
        email: normalized,
        passwordHash: hash,
        role,
        emailVerified: true,
      },
    });
    if (role === "admin") {
      await ensureUserSubscription(Number(user.id), "pro", "active");
    } else if (!(await getUserPlan(Number(user.id)))) {
      await createTrialSubscription(Number(user.id));
    }
    return toAuthUser(user);
  }

  db.prepare(
    `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, email_verified)
     VALUES (?, ?, ?, ?, ?, 1)`,
  ).run(tokenUser.id, tokenUser.name || normalized.split("@")[0], normalized, hash, role);

  if (role === "admin") {
    await ensureUserSubscription(tokenUser.id, "pro", "active");
  } else if (!(await getUserPlan(tokenUser.id))) {
    await createTrialSubscription(tokenUser.id);
  }

  const restored = await getUserById(tokenUser.id);
  if (!restored) throw new AppError("Sessão expirada. Entre novamente para continuar.", 401);
  return restored;
}

export async function updateProfile(
  userId: number,
  data: { name?: string; studioName?: string; studioRole?: string; phone?: string },
): Promise<AuthUser> {
  const current = await getUserById(userId);
  if (!current) throw new AppError("Sessão expirada. Entre novamente para continuar.", 401);

  if (shouldUsePrisma) {
    const updated = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        name: data.name?.trim() || current.name || null,
        studioName: data.studioName?.trim() || current.studioName || null,
        studioRole: data.studioRole?.trim() || current.studioRole || null,
        phone: data.phone?.trim() || current.phone || null,
      },
    });
    return toAuthUser(updated);
  }

  db.prepare(
    `UPDATE users
     SET name = ?, studio_name = ?, studio_role = ?, phone = ?
     WHERE id = ?`,
  ).run(
    data.name?.trim() || current.name || null,
    data.studioName?.trim() || current.studioName || null,
    data.studioRole?.trim() || current.studioRole || null,
    data.phone?.trim() || current.phone || null,
    userId,
  );

  const updated = await getUserById(userId);
  if (!updated) throw new AppError("Sessão expirada. Entre novamente para continuar.", 401);
  return updated;
}

function roleForEmail(email: string): "user" | "admin" {
  return isAdminEmail(email) ? "admin" : "user";
}

export async function upsertOAuthUser(
  email: string,
  name?: string | null,
  access?: { role?: "user" | "admin"; planId?: string; supabaseId?: string },
): Promise<AuthUser> {
  const normalized = email.toLowerCase().trim();
  const role = access?.role === "admin" || roleForEmail(normalized) === "admin" ? "admin" : "user";
  if (shouldUsePrisma) {
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          role,
          supabaseId: access?.supabaseId || existing.supabaseId,
        },
      });
      if (access?.planId) await updateUserPlanInDatabase(Number(updated.id), access.planId);
      return toAuthUser(updated);
    }

    const created = await prisma.user.create({
      data: {
        name: name ?? normalized.split("@")[0],
        email: normalized,
        passwordHash: hashPassword(crypto.randomBytes(24).toString("hex")),
        role,
        emailVerified: true,
        supabaseId: access?.supabaseId || null,
      },
    });
    if (access?.planId) await ensureUserSubscription(Number(created.id), access.planId, "active");
    else await createTrialSubscription(Number(created.id));
    notifyAdmins(
      "Conta sincronizada",
      `${name || normalized} entrou pela autenticacao persistente.`,
      "user",
      "/admin/gerenciar",
    );
    return toAuthUser(created);
  }

  const existing = db
    .prepare("SELECT id, email, role, name FROM users WHERE email = ?")
    .get(normalized) as AuthUser | undefined;

  if (existing) {
    if (access?.supabaseId) {
      db.prepare("UPDATE users SET supabase_id = ? WHERE id = ?").run(access.supabaseId, existing.id);
    }
    if (existing.role !== role) {
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, existing.id);
      existing.role = role;
    }
    if (access?.planId) await updateUserPlanInDatabase(existing.id, access.planId);
    return existing;
  }

  const hash = hashPassword(crypto.randomBytes(24).toString("hex"));
  const result = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, email_verified, supabase_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(name ?? normalized.split("@")[0], normalized, hash, role, 1, access?.supabaseId || null);

  const userId = Number(result.lastInsertRowid);
  if (access?.planId) await ensureUserSubscription(userId, access.planId, "active");
  else await createTrialSubscription(userId);
  notifyAdmins(
    "Conta sincronizada",
    `${name || normalized} entrou pela autenticacao persistente.`,
    "user",
    "/admin/gerenciar",
  );

  return {
    id: userId,
    email: normalized,
    role,
    name: name ?? undefined,
  };
}

/** Public registration: user + 14-day Pro trial */
export async function registerUser(name: string, email: string, password: string) {
  const normalized = email.toLowerCase().trim();
  if (shouldUsePrisma) {
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) throw new AppError("E-mail já cadastrado.", 409);

    const created = await prisma.user.create({
      data: {
        name,
        email: normalized,
        passwordHash: hashPassword(password),
        role: "user",
        emailVerified: false,
      },
    });
    await createTrialSubscription(Number(created.id));
    notifyAdmins(
      "Nova conta criada",
      `${name} (${normalized}) criou acesso na plataforma e recebeu trial Pro de 14 dias.`,
      "user",
      "/admin/gerenciar",
    );
    return { id: Number(created.id), name, email: normalized, role: "user" as const };
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized);
  if (existing) {
    throw new AppError("E-mail já cadastrado.", 409);
  }

  const hash = hashPassword(password);
  const result = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?)",
    )
    .run(name, normalized, hash, "user", 0);

  const userId = Number(result.lastInsertRowid);
  await createTrialSubscription(userId);
  notifyAdmins(
    "Nova conta criada",
    `${name} (${normalized}) criou acesso na plataforma e recebeu trial Pro de 14 dias.`,
    "user",
    "/admin/gerenciar",
  );

  return { id: userId, name, email: normalized, role: "user" as const };
}

export async function createManagedUser(data: {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  planId: string;
}) {
  const normalized = data.email.toLowerCase().trim();
  const existing = shouldUsePrisma
    ? await prisma.user.findUnique({ where: { email: normalized } })
    : db.prepare("SELECT id FROM users WHERE email = ?").get(normalized);
  if (existing) {
    throw new AppError("E-mail já cadastrado.", 409);
  }

  const role = data.role === "admin" || isAdminEmail(normalized) ? "admin" : "user";
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new AppError("Supabase Admin nao esta configurado para criar acessos persistentes.", 503);
  }

  const trimmedName = data.name.trim();
  const supabaseUser = await createSupabaseManagedUser(supabaseUrl, serviceRoleKey, {
    name: trimmedName,
    email: normalized,
    password: data.password,
    role,
    planId: data.planId,
  });

  const hash = hashPassword(data.password);
  if (shouldUsePrisma) {
    const created = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalized,
        passwordHash: hash,
        role,
        emailVerified: true,
        supabaseId: supabaseUser.id || null,
      },
    });
    await ensureUserSubscription(Number(created.id), data.planId, "active");

    notifyAdmins(
      "Conta criada pelo admin",
      `${trimmedName} (${normalized}) recebeu acesso ${data.planId.toUpperCase()} como ${role}.`,
      "user",
      "/admin/gerenciar",
    );

    return {
      id: Number(created.id),
      name: trimmedName,
      email: normalized,
      role,
      planId: data.planId,
    };
  }

  const result = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, email_verified, supabase_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(trimmedName, normalized, hash, role, 1, supabaseUser.id || null);

  const userId = Number(result.lastInsertRowid);
  await ensureUserSubscription(userId, data.planId, "active");

  notifyAdmins(
    "Conta criada pelo admin",
    `${trimmedName} (${normalized}) recebeu acesso ${data.planId.toUpperCase()} como ${role}.`,
    "user",
    "/admin/gerenciar",
  );

  return {
    id: userId,
    name: trimmedName,
    email: normalized,
    role,
    planId: data.planId,
  };
}

export async function getUserPlan(userId: number): Promise<UserPlanRow | undefined> {
  if (shouldUsePrisma) {
    const row = await prisma.subscription.findFirst({
      where: { userId: BigInt(userId) },
      include: { plan: true },
      orderBy: { id: "desc" },
    });
    return row ? toPlanRow(row) : undefined;
  }

  return db
    .prepare(
      `SELECT s.status, s.trial_ends_at, s.current_period_end, p.id as plan_id,
              p.name as plan_name, p.generation_limit, p.features
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = ?
       ORDER BY s.id DESC LIMIT 1`,
    )
    .get(userId) as UserPlanRow | undefined;
}

async function ensureUsablePlan(userId: number): Promise<UserPlanRow | undefined> {
  let plan = await getUserPlan(userId);
  if (!plan) {
    await createTrialSubscription(userId);
    return getUserPlan(userId);
  }

  if (
    plan.status === "trial" &&
    plan.trial_ends_at &&
    new Date(plan.trial_ends_at).getTime() < Date.now()
  ) {
    if (shouldUsePrisma) {
      await prisma.subscription.updateMany({
        where: { userId: BigInt(userId) },
        data: {
          planId: "free",
          status: "active",
          trialEndsAt: null,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return getUserPlan(userId);
    }

    db.prepare(
      `UPDATE subscriptions
       SET plan_id = 'free', status = 'active', trial_ends_at = NULL,
           current_period_start = datetime('now'),
           current_period_end = datetime('now', '+1 month')
       WHERE user_id = ?`,
    ).run(userId);
    plan = await getUserPlan(userId);
  }

  return plan;
}

export async function checkAndIncrementUsage(userId: number, toolId: string) {
  if (shouldUsePrisma) {
    const userRow = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { role: true, email: true },
    });
    const role = userRow?.role;
    const email = userRow?.email?.toLowerCase();
    if (role === "admin" || isAdminEmail(email)) return;

    const plan = await ensureUsablePlan(userId);
    if (!plan) {
      throw new AppError("Não conseguimos ativar seu plano automaticamente. Tente sair e entrar novamente.", 403);
    }
    if (plan.generation_limit === -1) return;

    const period = new Date().toISOString().slice(0, 7);
    await prisma.usage.upsert({
      where: { userId_toolId_period: { userId: BigInt(userId), toolId, period } },
      create: { userId: BigInt(userId), toolId, period, count: 0 },
      update: {},
    });
    const totalRow = await prisma.usage.aggregate({
      where: { userId: BigInt(userId), period },
      _sum: { count: true },
    });
    const total = totalRow._sum.count ?? 0;
    if (total >= plan.generation_limit) {
      throw new AppError(
        `Você atingiu ${plan.generation_limit} gerações neste mês. Seu trabalho foi preservado; atualize o plano ou chame o administrador para liberar mais uso.`,
        403,
      );
    }
    await prisma.usage.update({
      where: { userId_toolId_period: { userId: BigInt(userId), toolId, period } },
      data: { count: { increment: 1 } },
    });
    return;
  }

  const userRow = db.prepare("SELECT role, email FROM users WHERE id = ?").get(userId) as { role: string; email: string } | undefined;
  const role = userRow?.role;
  const email = userRow?.email?.toLowerCase();
  if (role === "admin" || isAdminEmail(email)) return;

  const plan = await ensureUsablePlan(userId);
  if (!plan) {
    throw new AppError("Não conseguimos ativar seu plano automaticamente. Tente sair e entrar novamente.", 403);
  }

  if (plan.generation_limit === -1) return;

  const period = new Date().toISOString().slice(0, 7);

  db.prepare(
    "INSERT INTO usage (user_id, tool_id, period, count) VALUES (?, ?, ?, 0) ON CONFLICT(user_id, tool_id, period) DO NOTHING",
  ).run(userId, toolId, period);

  const totalRow = db
    .prepare("SELECT SUM(count) as total FROM usage WHERE user_id = ? AND period = ?")
    .get(userId, period) as { total: number | null };

  const total = totalRow?.total ?? 0;
  if (total >= plan.generation_limit) {
    throw new AppError(
      `Você atingiu ${plan.generation_limit} gerações neste mês. Seu trabalho foi preservado; atualize o plano ou chame o administrador para liberar mais uso.`,
      403,
    );
  }

  db.prepare(
    "UPDATE usage SET count = count + 1 WHERE user_id = ? AND tool_id = ? AND period = ?",
  ).run(userId, toolId, period);
}

export async function createResetToken(email: string) {
  const normalized = email.toLowerCase().trim();
  if (shouldUsePrisma) {
    const user = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });
    if (!user) return;
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.resetToken.deleteMany({ where: { userId: user.id } });
    await prisma.resetToken.create({ data: { userId: user.id, token, expiresAt: expires } });
    return token;
  }

  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized) as
    | { id: number }
    | undefined;
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV] Reset token for ${normalized}: ${token}`);
  }

  db.prepare("DELETE FROM reset_tokens WHERE user_id = ?").run(user.id);
  db.prepare("INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)").run(
    user.id,
    token,
    expires,
  );

  return token;
}

export async function resetPassword(token: string, newPassword: string) {
  if (shouldUsePrisma) {
    const row = await prisma.resetToken.findFirst({
      where: { token, used: false, expiresAt: { gt: new Date() } },
    });
    if (!row) throw new AppError("Token inválido ou expirado.", 400);
    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { passwordHash: hashPassword(newPassword) } }),
      prisma.resetToken.update({ where: { id: row.id }, data: { used: true } }),
    ]);
    return;
  }

  const row = db
    .prepare(
      "SELECT * FROM reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')",
    )
    .get(token) as { id: number; user_id: number } | undefined;

  if (!row) {
    throw new AppError("Token inválido ou expirado.", 400);
  }

  const hash = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, row.user_id);
  db.prepare("UPDATE reset_tokens SET used = 1 WHERE id = ?").run(row.id);
}

export async function countUsers(): Promise<number> {
  if (shouldUsePrisma) return prisma.user.count();

  const row = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  return row.c;
}

export async function listAllUsers(): Promise<Array<{
  id: number;
  name: string | null;
  email: string;
  role: string;
  github_id: string | null;
  created_at: string;
  plan_name: string | null;
  generation_limit: number | null;
  project_count: number;
  file_count: number;
  review_count: number;
}>> {
  if (shouldUsePrisma) {
    const users = await prisma.user.findMany({
      include: {
        subscriptions: { include: { plan: true }, orderBy: { id: "desc" }, take: 1 },
        _count: { select: { projects: true, files: true, videoReviews: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return users.map((user) => {
      const subscription = user.subscriptions[0];
      return {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
        github_id: user.githubId,
        created_at: user.createdAt.toISOString(),
        plan_name: subscription?.plan.name ?? null,
        generation_limit: subscription?.plan.generationLimit ?? null,
        project_count: user._count.projects,
        file_count: user._count.files,
        review_count: user._count.videoReviews,
      };
    });
  }

  return db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.github_id, u.created_at,
              p.name as plan_name, p.generation_limit,
              COUNT(DISTINCT pr.id) as project_count,
              COUNT(DISTINCT f.id) as file_count,
              COUNT(DISTINCT vr.id) as review_count
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       LEFT JOIN plans p ON p.id = s.plan_id
       LEFT JOIN projects pr ON pr.user_id = u.id
       LEFT JOIN files f ON f.user_id = u.id
       LEFT JOIN video_reviews vr ON vr.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
    )
    .all() as any[];
}

async function updateUserPlanInDatabase(userId: number, planId: string) {
  if (shouldUsePrisma) {
    const validPlan = await prisma.plan.findUnique({ where: { id: planId }, select: { id: true } });
    if (!validPlan) throw new AppError("Invalid plan ID", 400);
    const existing = await prisma.subscription.findFirst({ where: { userId: BigInt(userId) } });
    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planId,
          status: "active",
          trialEndsAt: null,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: BigInt(userId),
          planId,
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
    return;
  }

  const validPlans = db.prepare("SELECT id FROM plans").all() as { id: string }[];
  if (!validPlans.some((p) => p.id === planId)) throw new AppError("Invalid plan ID", 400);
  const existing = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").get(userId);
  if (existing) {
    db.prepare("UPDATE subscriptions SET plan_id = ?, status = 'active', trial_ends_at = NULL, current_period_end = datetime('now', '+1 month') WHERE user_id = ?").run(planId, userId);
  } else {
    db.prepare("INSERT INTO subscriptions (user_id, plan_id, status, current_period_end) VALUES (?, ?, 'active', datetime('now', '+1 month'))").run(userId, planId);
  }
}

async function syncSupabaseAccess(userId: number) {
  if (shouldUsePrisma) {
    const access = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        supabaseId: true,
        role: true,
        subscriptions: { select: { planId: true }, orderBy: { id: "desc" }, take: 1 },
      },
    });
    if (!access?.supabaseId) return;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) throw new AppError("Supabase Admin nao esta configurado.", 503);
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${access.supabaseId}`, {
      method: "PUT",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_metadata: { role: access.role, plan_id: access.subscriptions[0]?.planId || "free" },
      }),
    });
    if (!response.ok) throw new AppError("Nao foi possivel sincronizar a permissao no Supabase.", 502);
    return;
  }

  const access = db.prepare(
    `SELECT u.supabase_id, u.role, s.plan_id
     FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id
     WHERE u.id = ? ORDER BY s.id DESC LIMIT 1`,
  ).get(userId) as { supabase_id?: string | null; role: string; plan_id?: string | null } | undefined;
  if (!access?.supabase_id) return;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new AppError("Supabase Admin nao esta configurado.", 503);
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${access.supabase_id}`, {
    method: "PUT",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ app_metadata: { role: access.role, plan_id: access.plan_id || "free" } }),
  });
  if (!response.ok) throw new AppError("Nao foi possivel sincronizar a permissao no Supabase.", 502);
}

export async function updateUserRole(userId: number, role: string, actorId?: number) {
  if (!["user", "admin"].includes(role)) {
    throw new AppError("Invalid role. Must be 'user' or 'admin'.", 400);
  }

  const user = shouldUsePrisma
    ? await prisma.user.findUnique({ where: { id: BigInt(userId) }, select: { id: true, role: true } })
    : db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId) as
      | { id: number | bigint; role: string }
      | undefined;
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (actorId === userId && role !== "admin") {
    throw new AppError("Você não pode remover seu próprio acesso admin.", 400);
  }
  if (user.role === "admin" && role !== "admin") {
    const adminCount = shouldUsePrisma
      ? await prisma.user.count({ where: { role: "admin" } })
      : (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number }).c;
    if (adminCount <= 1) {
      throw new AppError("Mantenha pelo menos um administrador ativo.", 400);
    }
  }

  if (shouldUsePrisma) {
    await prisma.user.update({ where: { id: BigInt(userId) }, data: { role } });
    await syncSupabaseAccess(userId);
    return;
  }

  const result = db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  if (result.changes === 0) {
    throw new AppError("User not found", 404);
  }
  await syncSupabaseAccess(userId);
}

export async function updateUserPlan(userId: number, planId: string) {
  await updateUserPlanInDatabase(userId, planId);
  await syncSupabaseAccess(userId);
}

export async function deleteManagedUser(userId: number, actorId: number) {
  if (userId === actorId) {
    throw new AppError("Você não pode apagar a própria conta enquanto está logado.", 400);
  }

  const user = shouldUsePrisma
    ? await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true, email: true, role: true, supabaseId: true },
    })
    : db
      .prepare("SELECT id, email, role, supabase_id FROM users WHERE id = ?")
      .get(userId) as { id: number | bigint; email: string; role: string; supabase_id?: string | null; supabaseId?: string | null } | undefined;
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.role === "admin") {
    const adminCount = shouldUsePrisma
      ? await prisma.user.count({ where: { role: "admin" } })
      : (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number }).c;
    if (adminCount <= 1) {
      throw new AppError("Mantenha pelo menos um administrador ativo.", 400);
    }
  }

  if (shouldUsePrisma) {
    const [projects, clients, files, reviews, generations] = await Promise.all([
      prisma.project.count({ where: { userId: BigInt(userId) } }),
      prisma.client.count({ where: { userId: BigInt(userId) } }),
      prisma.file.count({ where: { userId: BigInt(userId) } }),
      prisma.videoReview.count({ where: { userId: BigInt(userId) } }),
      prisma.generation.count({ where: { userId: BigInt(userId) } }),
    ]);

    if (user.supabaseId) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) throw new AppError("Supabase Admin nao esta configurado.", 503);
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.supabaseId}`, {
        method: "DELETE",
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      });
      if (!response.ok && response.status !== 404) {
        throw new AppError("Nao foi possivel apagar a conta persistente no Supabase.", 502);
      }
    }

    await prisma.user.delete({ where: { id: BigInt(userId) } });
    return {
      id: userId,
      email: user.email,
      deleted: true,
      summary: { projects, clients, files, reviews, generations },
    };
  }

  const summary = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM projects WHERE user_id = ?) as projects,
         (SELECT COUNT(*) FROM clients WHERE user_id = ?) as clients,
         (SELECT COUNT(*) FROM files WHERE user_id = ?) as files,
         (SELECT COUNT(*) FROM video_reviews WHERE user_id = ?) as reviews,
         (SELECT COUNT(*) FROM generations WHERE user_id = ?) as generations`,
    )
    .get(userId, userId, userId, userId, userId) as {
    projects: number;
    clients: number;
    files: number;
    reviews: number;
    generations: number;
  };

  const remove = db.transaction(() => {
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });

  const sqliteSupabaseId = "supabase_id" in user ? user.supabase_id : user.supabaseId;
  if (sqliteSupabaseId) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) throw new AppError("Supabase Admin nao esta configurado.", 503);
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${sqliteSupabaseId}`, {
      method: "DELETE",
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!response.ok && response.status !== 404) {
      throw new AppError("Nao foi possivel apagar a conta persistente no Supabase.", 502);
    }
  }
  remove();

  return {
    id: userId,
    email: user.email,
    deleted: true,
    summary,
  };
}
