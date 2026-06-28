import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../models/db.js";
import type { AuthUser } from "../middleware/authenticate.js";
import { AppError } from "../middleware/errorHandler.js";
import { notifyAdmins } from "./notificationService.js";

interface DbUser {
  id: number;
  email: string;
  password_hash: string;
  role: "user" | "admin";
  name?: string | null;
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

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = new Set(
    ["admin@cenastudio.com.br", "admin@frame.ai", ...(process.env.ADMIN_EMAILS || "").split(",")]
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  return adminEmails.has(email.toLowerCase().trim());
}

export function ensureUserSubscription(userId: number, planId: string, status = "active") {
  const existing = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").get(userId);
  if (!existing) {
    db.prepare(
      `INSERT INTO subscriptions (user_id, plan_id, status, current_period_end)
       VALUES (?, ?, ?, datetime('now', '+1 month'))`,
    ).run(userId, planId, status);
  }
}

function createTrialSubscription(userId: number) {
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    "INSERT INTO subscriptions (user_id, plan_id, status, trial_ends_at, current_period_end) VALUES (?, ?, ?, ?, ?)",
  ).run(userId, "pro", "trial", trialEnd, trialEnd);
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

export function loginUser(email: string, password: string): AuthUser {
  const normalized = email.toLowerCase().trim();
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

export function getUserById(id: number): AuthUser | null {
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

export function ensureUserFromToken(tokenUser: AuthUser): AuthUser {
  const existing = getUserById(tokenUser.id);
  if (existing) return existing;

  const normalized = tokenUser.email.toLowerCase().trim();
  const role = tokenUser.role === "admin" || isAdminEmail(normalized) ? "admin" : "user";
  const hash = hashPassword(crypto.randomBytes(24).toString("hex"));

  db.prepare(
    `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, email_verified)
     VALUES (?, ?, ?, ?, ?, 1)`,
  ).run(tokenUser.id, tokenUser.name || normalized.split("@")[0], normalized, hash, role);

  if (role === "admin") {
    ensureUserSubscription(tokenUser.id, "pro", "active");
  } else if (!getUserPlan(tokenUser.id)) {
    createTrialSubscription(tokenUser.id);
  }

  const restored = getUserById(tokenUser.id);
  if (!restored) throw new AppError("Sessão expirada. Entre novamente para continuar.", 401);
  return restored;
}

export function updateProfile(
  userId: number,
  data: { name?: string; studioName?: string; studioRole?: string; phone?: string },
): AuthUser {
  const current = getUserById(userId);
  if (!current) throw new AppError("Sessão expirada. Entre novamente para continuar.", 401);

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

  const updated = getUserById(userId);
  if (!updated) throw new AppError("Sessão expirada. Entre novamente para continuar.", 401);
  return updated;
}

function roleForEmail(email: string): "user" | "admin" {
  return isAdminEmail(email) ? "admin" : "user";
}

export function upsertOAuthUser(
  email: string,
  name?: string | null,
  access?: { role?: "user" | "admin"; planId?: string; supabaseId?: string },
): AuthUser {
  const normalized = email.toLowerCase().trim();
  const role = access?.role === "admin" || roleForEmail(normalized) === "admin" ? "admin" : "user";
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
    if (access?.planId) updateUserPlanInDatabase(existing.id, access.planId);
    return existing;
  }

  const hash = hashPassword(crypto.randomBytes(24).toString("hex"));
  const result = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, email_verified, supabase_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(name ?? normalized.split("@")[0], normalized, hash, role, 1, access?.supabaseId || null);

  const userId = Number(result.lastInsertRowid);
  if (access?.planId) ensureUserSubscription(userId, access.planId, "active");
  else createTrialSubscription(userId);
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
export function registerUser(name: string, email: string, password: string) {
  const normalized = email.toLowerCase().trim();
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
  createTrialSubscription(userId);
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
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized);
  if (existing) {
    throw new AppError("E-mail já cadastrado.", 409);
  }

  const role = data.role === "admin" || isAdminEmail(normalized) ? "admin" : "user";
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new AppError("Supabase Admin nao esta configurado para criar acessos persistentes.", 503);
  }

  const supabaseResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalized,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name.trim() },
      app_metadata: { role, plan_id: data.planId },
    }),
  });

  if (!supabaseResponse.ok) {
    const detail = await supabaseResponse.json().catch(() => ({})) as { message?: string; error_description?: string };
    const message = detail.message || detail.error_description || "Nao foi possivel criar o acesso no Supabase.";
    throw new AppError(message, supabaseResponse.status === 422 ? 409 : 502);
  }
  const supabaseUser = await supabaseResponse.json() as { id?: string };

  const hash = hashPassword(data.password);
  const result = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, email_verified, supabase_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(data.name.trim(), normalized, hash, role, 1, supabaseUser.id || null);

  const userId = Number(result.lastInsertRowid);
  ensureUserSubscription(userId, data.planId, "active");

  notifyAdmins(
    "Conta criada pelo admin",
    `${data.name} (${normalized}) recebeu acesso ${data.planId.toUpperCase()} como ${role}.`,
    "user",
    "/admin/gerenciar",
  );

  return {
    id: userId,
    name: data.name.trim(),
    email: normalized,
    role,
    planId: data.planId,
  };
}

export function getUserPlan(userId: number): UserPlanRow | undefined {
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

function ensureUsablePlan(userId: number): UserPlanRow | undefined {
  let plan = getUserPlan(userId);
  if (!plan) {
    createTrialSubscription(userId);
    return getUserPlan(userId);
  }

  if (
    plan.status === "trial" &&
    plan.trial_ends_at &&
    new Date(plan.trial_ends_at).getTime() < Date.now()
  ) {
    db.prepare(
      `UPDATE subscriptions
       SET plan_id = 'free', status = 'active', trial_ends_at = NULL,
           current_period_start = datetime('now'),
           current_period_end = datetime('now', '+1 month')
       WHERE user_id = ?`,
    ).run(userId);
    plan = getUserPlan(userId);
  }

  return plan;
}

export function checkAndIncrementUsage(userId: number, toolId: string) {
  const userRow = db.prepare("SELECT role, email FROM users WHERE id = ?").get(userId) as { role: string; email: string } | undefined;
  const role = userRow?.role;
  const email = userRow?.email?.toLowerCase();
  if (role === "admin" || isAdminEmail(email)) return;

  const plan = ensureUsablePlan(userId);
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

export function createResetToken(email: string) {
  const normalized = email.toLowerCase().trim();
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

  console.log(`[DEV] Reset token for ${normalized}: ${token}`);
  return token;
}

export function resetPassword(token: string, newPassword: string) {
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

export function countUsers(): number {
  const row = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  return row.c;
}

export function listAllUsers(): Array<{
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
}> {
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

function updateUserPlanInDatabase(userId: number, planId: string) {
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

  const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(userId) as
    | { id: number; role: string }
    | undefined;
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (actorId === userId && role !== "admin") {
    throw new AppError("Você não pode remover seu próprio acesso admin.", 400);
  }
  if (user.role === "admin" && role !== "admin") {
    const row = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number };
    if (row.c <= 1) {
      throw new AppError("Mantenha pelo menos um administrador ativo.", 400);
    }
  }

  const result = db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  if (result.changes === 0) {
    throw new AppError("User not found", 404);
  }
  await syncSupabaseAccess(userId);
}

export async function updateUserPlan(userId: number, planId: string) {
  updateUserPlanInDatabase(userId, planId);
  await syncSupabaseAccess(userId);
}

export async function deleteManagedUser(userId: number, actorId: number) {
  if (userId === actorId) {
    throw new AppError("Você não pode apagar a própria conta enquanto está logado.", 400);
  }

  const user = db
    .prepare("SELECT id, email, role, supabase_id FROM users WHERE id = ?")
    .get(userId) as { id: number; email: string; role: string; supabase_id?: string | null } | undefined;
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.role === "admin") {
    const row = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number };
    if (row.c <= 1) {
      throw new AppError("Mantenha pelo menos um administrador ativo.", 400);
    }
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

  if (user.supabase_id) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) throw new AppError("Supabase Admin nao esta configurado.", 503);
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.supabase_id}`, {
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
