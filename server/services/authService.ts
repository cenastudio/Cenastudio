import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../models/db.js";
import type { AuthUser } from "../middleware/authenticate.js";
import { AppError } from "../middleware/errorHandler.js";

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
    .prepare("SELECT id, email, role, name FROM users WHERE id = ?")
    .get(id) as AuthUser | undefined;
  return row ?? null;
}

function roleForEmail(email: string): "user" | "admin" {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase()) ? "admin" : "user";
}

export function upsertOAuthUser(email: string, name?: string | null): AuthUser {
  const normalized = email.toLowerCase().trim();
  const role = roleForEmail(normalized);
  const existing = db
    .prepare("SELECT id, email, role, name FROM users WHERE email = ?")
    .get(normalized) as AuthUser | undefined;

  if (existing) {
    if (role === "admin" && existing.role !== "admin") {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
      existing.role = "admin";
    }
    return existing;
  }

  const hash = hashPassword(crypto.randomBytes(24).toString("hex"));
  const result = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?)",
    )
    .run(name ?? normalized.split("@")[0], normalized, hash, role, 1);

  const userId = Number(result.lastInsertRowid);
  createTrialSubscription(userId);

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

  return { id: userId, name, email: normalized, role: "user" as const };
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

export function checkAndIncrementUsage(userId: number, toolId: string) {
  const userRow = db.prepare("SELECT role, email FROM users WHERE id = ?").get(userId) as { role: string; email: string } | undefined;
  const role = userRow?.role;
  const email = userRow?.email?.toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (role === "admin" || adminEmails.includes(email || "")) return;

  const plan = getUserPlan(userId);
  if (!plan) {
    throw new AppError("Plano não encontrado.", 403);
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
      `Limite de ${plan.generation_limit} gerações/mês atingido. Faça upgrade do seu plano.`,
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
}> {
  return db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.github_id, u.created_at,
              p.name as plan_name, p.generation_limit
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       LEFT JOIN plans p ON p.id = s.plan_id
       ORDER BY u.created_at DESC`,
    )
    .all() as any[];
}

export function updateUserRole(userId: number, role: string) {
  if (!["user", "admin"].includes(role)) {
    throw new AppError("Invalid role. Must be 'user' or 'admin'.", 400);
  }
  const result = db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  if (result.changes === 0) {
    throw new AppError("User not found", 404);
  }
}

export function updateUserPlan(userId: number, planId: string) {
  const validPlans = db.prepare("SELECT id FROM plans").all() as { id: string }[];
  if (!validPlans.some((p) => p.id === planId)) {
    throw new AppError("Invalid plan ID", 400);
  }
  const existing = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").get(userId);
  if (existing) {
    db.prepare("UPDATE subscriptions SET plan_id = ?, status = 'active', trial_ends_at = NULL, current_period_end = datetime('now', '+1 month') WHERE user_id = ?").run(planId, userId);
  } else {
    db.prepare("INSERT INTO subscriptions (user_id, plan_id, status, current_period_end) VALUES (?, ?, 'active', datetime('now', '+1 month'))").run(userId, planId);
  }
}
