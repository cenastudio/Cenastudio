/**
 * LGPD Service
 *
 * Implementa os requisitos da Lei nº 13.709/2018 (LGPD) e GDPR
 * para conformidade legal e proteção de dados pessoais.
 *
 * Principais funcionalidades:
 * - Transparência de dados (Art. 9)
 * - Direitos do titular (Art. 18): acesso, correção, exclusão
 * - Controles de privacidade
 */

import { createClient } from "@supabase/supabase-js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { isEmailConfigured } from "./emailService.js";
import { cancelSubscriptionForErasure } from "./stripeService.js";
import { jsonSafe } from "../utils/prismaSerialization.js";
import { logger } from "../utils/logger.js";
import { SITE_CONFIG } from "@shared/site";
import {
  sendPrivacyRequestReceivedEmail,
  sendPrivacyRequestResolvedEmail,
} from "./privacyEmailService.js";
import type { TransactionalEmailLocale } from "./transactionalEmail.js";

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────

export interface DataStats {
  projects: { count: number; size: number };
  files: { count: number; size: number };
  clients: { count: number; size: number };
  reviews: { count: number; size: number };
  totalSize: number;
}

export interface PrivacySettings {
  profileVisibility: "public" | "team" | "private";
  allowSearchEngineIndexing: boolean;
  shareAnalyticsWithTeam: boolean;
}

export type LgpdRequestType = "copy" | "correct" | "delete";

interface PrivacyEmailRecipient {
  email: string;
  name: string | null;
  locale: TransactionalEmailLocale;
}

function localeFromRegionalPrefs(value: unknown): TransactionalEmailLocale {
  if (value && typeof value === "object" && (value as { locale?: unknown }).locale === "en") return "en";
  if (typeof value === "string") {
    try {
      return (JSON.parse(value) as { locale?: unknown }).locale === "en" ? "en" : "pt";
    } catch {
      return "pt";
    }
  }
  return "pt";
}

function getClientOrigin(): string {
  return process.env.CLIENT_ORIGIN || "http://localhost:5173";
}

function parseRequestCreatedAt(value: string): Date {
  // Prisma returns ISO 8601. SQLite's datetime('now') returns a UTC timestamp
  // without the `Z`, which JavaScript otherwise treats as local time.
  const normalized = value.includes("T") || /[zZ]$/.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  return new Date(normalized);
}

// ────────────────────────────────────────────────────────────────
// TRANSPARÊNCIA DE DADOS (LGPD Art. 9)
// ────────────────────────────────────────────────────────────────

/**
 * Calcula estatísticas de dados armazenados do usuário
 * Implementa o direito à transparência (LGPD Art. 9)
 */
export async function calculateDataStats(userId: number): Promise<DataStats> {
  if (shouldUsePrisma) {
    const uid = BigInt(userId);
    const [projects, files, clients, reviews] = await Promise.all([
      // Projects: estimar 50KB por projeto (metadata JSON)
      prisma.project.count({ where: { userId: uid } }),

      // Files: somar tamanho real dos arquivos
      prisma.file.aggregate({
        where: { userId: uid },
        _count: true,
        _sum: { size: true },
      }),

      // Clients: estimar 5KB por cliente
      prisma.client.count({ where: { userId: uid } }),

      // Reviews: estimar 100KB por review (com comentários)
      prisma.videoReview.count({ where: { userId: uid } }),
    ]);

    const projectsSize = projects * 0.05; // 50KB em MB
    const filesSize = (files._sum.size || 0) / (1024 * 1024); // Bytes to MB
    const clientsSize = clients * 0.005; // 5KB em MB
    const reviewsSize = reviews * 0.1; // 100KB em MB

    return {
      projects: { count: projects, size: parseFloat(projectsSize.toFixed(2)) },
      files: { count: files._count || 0, size: parseFloat(filesSize.toFixed(2)) },
      clients: { count: clients, size: parseFloat(clientsSize.toFixed(2)) },
      reviews: { count: reviews, size: parseFloat(reviewsSize.toFixed(2)) },
      totalSize: parseFloat((projectsSize + filesSize + clientsSize + reviewsSize).toFixed(2)),
    };
  } else {
    // SQLite fallback
    const projects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ?").get(userId) as { count: number };
    const files = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total FROM files WHERE user_id = ?").get(userId) as { count: number; total: number };
    const clients = db.prepare("SELECT COUNT(*) as count FROM clients WHERE user_id = ?").get(userId) as { count: number };
    const reviews = db.prepare("SELECT COUNT(*) as count FROM video_reviews WHERE user_id = ?").get(userId) as { count: number };

    const projectsSize = projects.count * 0.05;
    const filesSize = files.total / (1024 * 1024);
    const clientsSize = clients.count * 0.005;
    const reviewsSize = reviews.count * 0.1;

    return {
      projects: { count: projects.count, size: parseFloat(projectsSize.toFixed(2)) },
      files: { count: files.count, size: parseFloat(filesSize.toFixed(2)) },
      clients: { count: clients.count, size: parseFloat(clientsSize.toFixed(2)) },
      reviews: { count: reviews.count, size: parseFloat(reviewsSize.toFixed(2)) },
      totalSize: parseFloat((projectsSize + filesSize + clientsSize + reviewsSize).toFixed(2)),
    };
  }
}

// ────────────────────────────────────────────────────────────────
// PORTABILIDADE / ACESSO AOS DADOS (LGPD Art. 18, II e V)
// ────────────────────────────────────────────────────────────────

/**
 * Campos sensíveis do usuário que NUNCA devem sair no export
 * (credenciais e segredos de segurança). O restante do perfil é
 * dado do próprio titular e pode ser portado.
 */
const REDACTED_USER_FIELDS = new Set([
  "passwordHash",
  "password_hash",
  "twoFactorSecret",
  "two_factor_secret",
  "backupCodes",
  "backup_codes",
  "supabaseId",
  "supabase_id",
]);

function redactUser<T extends Record<string, unknown>>(user: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(user).filter(([key]) => !REDACTED_USER_FIELDS.has(key)),
  );
}

/** Tabelas SQLite com coluna user_id que compõem o pacote de dados do titular. */
const SQLITE_USER_TABLES = [
  "subscriptions",
  "usage",
  "clients",
  "projects",
  "opportunities",
  "interactions",
  "proposals",
  "meetings",
  "files",
  "video_reviews",
  "video_comments",
  "financial_entries",
  "studio_settings",
  "notifications",
  "webhooks",
  "time_entries",
  "shot_types",
  "budgets",
  "equipment",
  "shot_lists",
  "checklist_items",
  "reports",
  "lgpd_requests",
] as const;

export interface UserDataExport {
  meta: {
    generatedAt: string;
    userId: number;
    brand: string;
    legalBasis: string;
    format: string;
  };
  profile: Record<string, unknown> | null;
  [collection: string]: unknown;
}

/**
 * Reúne, de forma síncrona e imediata, todos os dados pessoais e de negócio
 * do titular num objeto estruturado — atendendo de fato ao direito de acesso e
 * portabilidade (LGPD Art. 18, II e V / GDPR Art. 15 e 20). Credenciais e
 * segredos de segurança são redigidos.
 */
export async function exportUserData(userId: number): Promise<UserDataExport> {
  const meta = {
    generatedAt: new Date().toISOString(),
    userId,
    brand: SITE_CONFIG.brandName,
    legalBasis: "LGPD Art. 18, II e V / GDPR Art. 15 e 20",
    format: "cenastudio-data-export-v1",
  };

  if (shouldUsePrisma) {
    const uid = BigInt(userId);
    const where = { where: { userId: uid } } as const;

    const [
      user,
      subscriptions,
      usage,
      clients,
      projects,
      opportunities,
      interactions,
      proposals,
      meetings,
      files,
      videoReviews,
      videoComments,
      financialEntries,
      studioSettings,
      notifications,
      webhooks,
      timeEntries,
      shotTypes,
      lgpdRequests,
      apiKeys,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: uid } }),
      prisma.subscription.findMany(where),
      prisma.usage.findMany(where),
      prisma.client.findMany(where),
      prisma.project.findMany(where),
      prisma.opportunity.findMany(where),
      prisma.interaction.findMany(where),
      prisma.proposal.findMany(where),
      prisma.meeting.findMany(where),
      prisma.file.findMany(where),
      prisma.videoReview.findMany(where),
      prisma.videoComment.findMany(where),
      prisma.financialEntry.findMany(where),
      prisma.studioSetting.findUnique({ where: { userId: uid } }),
      prisma.notification.findMany(where),
      prisma.webhook.findMany(where),
      prisma.timeEntry.findMany(where),
      prisma.shotType.findMany(where),
      prisma.lgpdRequest.findMany(where),
      // Only non-secret API key metadata — never the key/secret itself.
      prisma.apiKey.findMany({ ...where, select: { id: true, name: true, createdAt: true, lastUsed: true } }),
    ]);

    return {
      meta,
      profile: user ? jsonSafe(redactUser(user as Record<string, unknown>)) : null,
      subscriptions: jsonSafe(subscriptions),
      usage: jsonSafe(usage),
      clients: jsonSafe(clients),
      projects: jsonSafe(projects),
      opportunities: jsonSafe(opportunities),
      interactions: jsonSafe(interactions),
      proposals: jsonSafe(proposals),
      meetings: jsonSafe(meetings),
      files: jsonSafe(files),
      videoReviews: jsonSafe(videoReviews),
      videoComments: jsonSafe(videoComments),
      financialEntries: jsonSafe(financialEntries),
      studioSettings: studioSettings ? jsonSafe(studioSettings) : null,
      notifications: jsonSafe(notifications),
      webhooks: jsonSafe(webhooks),
      timeEntries: jsonSafe(timeEntries),
      shotTypes: jsonSafe(shotTypes),
      lgpdRequests: jsonSafe(lgpdRequests),
      apiKeys: jsonSafe(apiKeys),
    };
  }

  // SQLite fallback — read the user profile plus every user-scoped table that
  // exists, tolerating tables that may be absent in a given schema version.
  const userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as Record<string, unknown> | undefined;
  const result: UserDataExport = {
    meta,
    profile: userRow ? redactUser(userRow) : null,
  };

  for (const table of SQLITE_USER_TABLES) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table} WHERE user_id = ?`).all(userId);
      result[table] = rows;
    } catch {
      // Table not present in this schema variant — skip it.
      result[table] = [];
    }
  }

  return result;
}

// ────────────────────────────────────────────────────────────────
// CONTROLES DE PRIVACIDADE
// ────────────────────────────────────────────────────────────────

/**
 * Salva configurações de privacidade do usuário
 */
export async function savePrivacySettings(
  userId: number,
  settings: PrivacySettings
): Promise<void> {
  if (shouldUsePrisma) {
    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { privacySettings: settings as any },
    });
  } else {
    db.prepare(
      "UPDATE users SET privacy_settings = ? WHERE id = ?"
    ).run(JSON.stringify(settings), userId);
  }
}

/**
 * Obtém configurações de privacidade do usuário
 */
export async function getPrivacySettings(userId: number): Promise<PrivacySettings> {
  if (shouldUsePrisma) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { privacySettings: true },
    });

    return (user?.privacySettings as unknown as PrivacySettings) || {
      profileVisibility: "team",
      allowSearchEngineIndexing: true,
      shareAnalyticsWithTeam: true,
    };
  } else {
    const row = db.prepare(
      "SELECT privacy_settings FROM users WHERE id = ?"
    ).get(userId) as { privacy_settings: string } | undefined;

    if (!row) {
      return {
        profileVisibility: "team",
        allowSearchEngineIndexing: true,
        shareAnalyticsWithTeam: true,
      };
    }

    return JSON.parse(row.privacy_settings);
  }
}

// ────────────────────────────────────────────────────────────────
// SOLICITAÇÕES LGPD/GDPR (Art. 18)
// ────────────────────────────────────────────────────────────────

/**
 * Cria uma solicitação LGPD (cópia, correção ou exclusão de dados)
 * Implementa LGPD Art. 18 (Direitos do titular)
 */
export async function createLgpdRequest(
  userId: number,
  type: LgpdRequestType,
  userEmail: string,
  userName: string | null,
  locale: TransactionalEmailLocale = "pt",
): Promise<{ requestId: string; estimatedDays: number }> {
  // Gerar ID único
  const requestId = `LGPD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  // Definir prazos legais conforme LGPD
  const estimatedDays = type === "copy" ? 30 : type === "correct" ? 5 : 7;

  // Salvar no banco
  if (shouldUsePrisma) {
    await prisma.lgpdRequest.create({
      data: {
        id: requestId,
        userId: BigInt(userId),
        type,
        status: "pending",
      },
    });
  } else {
    db.prepare(
      `INSERT INTO lgpd_requests (id, user_id, type, status, created_at)
       VALUES (?, ?, ?, 'pending', datetime('now'))`
    ).run(requestId, userId, type);
  }

  // E-mail transacional é best-effort: o pedido já foi persistido e não pode
  // depender da disponibilidade do provedor para existir.
  if (isEmailConfigured) {
    sendPrivacyRequestReceivedEmail({
      to: userEmail,
      name: userName,
      locale,
      type,
      requestId,
      estimatedDays,
      appUrl: getClientOrigin(),
    }).catch((err) => {
      logger.warn({ err, requestId }, "[LGPD] Falha ao enviar e-mail de confirmação");
    });
  }

  // Log para auditoria (console por enquanto, ideal seria um sistema de logs separado)
  console.log(`[LGPD] Nova solicitação: ${requestId} | Tipo: ${type} | User: ${userId} | Status: pending`);

  return { requestId, estimatedDays };
}

/**
 * Lista solicitações LGPD do usuário
 */
export async function listUserLgpdRequests(userId: number) {
  if (shouldUsePrisma) {
    return await prisma.lgpdRequest.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        processedAt: true,
        notes: true,
      },
    });
  } else {
    return db.prepare(
      `SELECT id, type, status, created_at, processed_at, notes
       FROM lgpd_requests WHERE user_id = ?
       ORDER BY created_at DESC`
    ).all(userId);
  }
}

/**
 * Lista todas as solicitações LGPD do sistema (admin only), com dados do
 * usuário solicitante — usado pelo painel administrativo para processar
 * pedidos de cópia/correção/exclusão dentro do prazo legal.
 */
export async function listAllLgpdRequests(status?: string) {
  if (shouldUsePrisma) {
    return await prisma.lgpdRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  const rows = status
    ? db.prepare(
        `SELECT r.id, r.user_id, r.type, r.status, r.notes, r.created_at, r.processed_at, r.processed_by,
                u.email, u.name
         FROM lgpd_requests r JOIN users u ON u.id = r.user_id
         WHERE r.status = ? ORDER BY r.created_at DESC`,
      ).all(status)
    : db.prepare(
        `SELECT r.id, r.user_id, r.type, r.status, r.notes, r.created_at, r.processed_at, r.processed_by,
                u.email, u.name
         FROM lgpd_requests r JOIN users u ON u.id = r.user_id
         ORDER BY r.created_at DESC`,
      ).all();

  return (rows as any[]).map((row) => ({
    id: row.id,
    type: row.type,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    processedAt: row.processed_at,
    processedBy: row.processed_by,
    user: { id: row.user_id, email: row.email, name: row.name },
  }));
}

// ────────────────────────────────────────────────────────────────
// EXCLUSÃO / ANONIMIZAÇÃO (LGPD Art. 18, VI / GDPR Art. 17)
// ────────────────────────────────────────────────────────────────

/**
 * Janela de carência (dias) entre a solicitação de exclusão e sua execução
 * irreversível. Protege contra fraude/arrependimento e é padrão de mercado.
 * Configurável por env; default 7 dias.
 */
export const DELETE_GRACE_DAYS = Math.max(0, Number(process.env.LGPD_DELETE_GRACE_DAYS ?? 7));

interface LgpdRequestRow {
  id: string;
  userId: number;
  type: LgpdRequestType;
  status: string;
  createdAt: string;
}

async function getPrivacyEmailRecipient(userId: number): Promise<PrivacyEmailRecipient | null> {
  if (shouldUsePrisma) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { email: true, name: true, regionalPrefs: true },
    });
    if (!user) return null;
    return {
      email: user.email,
      name: user.name,
      locale: localeFromRegionalPrefs(user.regionalPrefs),
    };
  }

  const row = db.prepare(
    "SELECT email, name, regional_prefs FROM users WHERE id = ?",
  ).get(userId) as { email: string; name: string | null; regional_prefs: string | null } | undefined;
  if (!row?.email) return null;
  return {
    email: row.email,
    name: row.name,
    locale: localeFromRegionalPrefs(row.regional_prefs),
  };
}

async function getLgpdRequest(requestId: string): Promise<LgpdRequestRow | null> {
  if (shouldUsePrisma) {
    const row = await prisma.lgpdRequest.findUnique({
      where: { id: requestId },
      select: { id: true, userId: true, type: true, status: true, createdAt: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      userId: Number(row.userId),
      type: row.type as LgpdRequestType,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }
  const row = db.prepare(
    "SELECT id, user_id, type, status, created_at FROM lgpd_requests WHERE id = ?",
  ).get(requestId) as { id: string; user_id: number; type: string; status: string; created_at: string } | undefined;
  if (!row) return null;
  return { id: row.id, userId: row.user_id, type: row.type as LgpdRequestType, status: row.status, createdAt: row.created_at };
}

/** Remove o usuário do Supabase Auth (best-effort) para impedir novo login. */
async function removeSupabaseAuthUser(supabaseId: string | null | undefined): Promise<void> {
  if (!supabaseId) return;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    await client.auth.admin.deleteUser(supabaseId);
  } catch (err) {
    logger.warn({ err }, "[LGPD] Falha ao remover usuário do Supabase Auth (seguindo com anonimização local)");
  }
}

/**
 * Anonimiza/apaga irreversivelmente os dados pessoais do titular (LGPD Art. 18,
 * VI). Segue as boas práticas: apaga dados pessoais sem valor de retenção,
 * anonimiza PII em registros preservados por integridade referencial e mantém
 * lançamentos financeiros (retenção fiscal/contábil), com o vínculo pessoal
 * ofuscado. É irreversível.
 */
export async function anonymizeUser(userId: number): Promise<void> {
  const placeholderEmail = `deleted-user-${userId}@anonymized.invalid`;
  const placeholderName = "Usuário removido";
  const clientName = "Cliente removido";

  // 1. Cancela cobrança recorrente (best-effort, nunca bloqueia a exclusão).
  const billing = await cancelSubscriptionForErasure(userId);
  if (billing.error) {
    logger.warn({ userId, error: billing.error }, "[LGPD] Cancelamento de assinatura falhou; seguindo com anonimização");
  }

  if (shouldUsePrisma) {
    const uid = BigInt(userId);
    const user = await prisma.user.findUnique({ where: { id: uid }, select: { supabaseId: true } });

    // 2. Remove arquivos pessoais do storage (best-effort) e do banco.
    const files = await prisma.file.findMany({ where: { userId: uid }, select: { path: true } });
    await removeStorageObjects(files.map((f) => f.path));

    // 3. Apaga dados pessoais sem valor de retenção.
    await prisma.file.deleteMany({ where: { userId: uid } });
    await prisma.notification.deleteMany({ where: { userId: uid } });
    await prisma.userSession.deleteMany({ where: { userId: uid } });
    await prisma.resetToken.deleteMany({ where: { userId: uid } });
    await prisma.apiKey.deleteMany({ where: { userId: uid } });
    await prisma.webhook.deleteMany({ where: { userId: uid } });

    // 4. Anonimiza PII em registros preservados.
    await prisma.client.updateMany({
      where: { userId: uid },
      data: {
        name: clientName, email: null, phone: null, contactPerson: null, contactRole: null,
        taxId: null, address: null, city: null, state: null, country: null,
        website: null, linkedin: null, instagram: null, notes: null,
      },
    });
    await prisma.interaction.updateMany({ where: { userId: uid }, data: { subject: null, notes: null } });
    await prisma.proposal.updateMany({
      where: { userId: uid },
      data: { acceptedByName: null, acceptedIp: null, acceptedUserAgent: null },
    });
    await prisma.meeting.updateMany({ where: { userId: uid }, data: { location: null, notes: null } });

    // 5. Anonimiza o próprio usuário e invalida credenciais/segredos.
    await prisma.user.update({
      where: { id: uid },
      data: {
        email: placeholderEmail,
        name: placeholderName,
        phone: null,
        avatarUrl: null,
        studioName: null,
        studioRole: null,
        githubId: null,
        supabaseId: null,
        passwordHash: `anonymized-${randomToken()}`,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [] as unknown as object,
        mustResetPassword: true,
        disabled: true,
      },
    });

    await removeSupabaseAuthUser(user?.supabaseId);
    logger.info({ userId }, "[LGPD] Usuário anonimizado (Prisma)");
    return;
  }

  // SQLite fallback
  const userRow = db.prepare("SELECT supabase_id FROM users WHERE id = ?").get(userId) as { supabase_id: string | null } | undefined;
  const files = db.prepare("SELECT path FROM files WHERE user_id = ?").all(userId) as Array<{ path: string }>;
  await removeStorageObjects(files.map((f) => f.path));

  const safeRun = (sql: string) => {
    try { db.prepare(sql).run(userId); } catch { /* table absent in this schema */ }
  };
  safeRun("DELETE FROM files WHERE user_id = ?");
  safeRun("DELETE FROM notifications WHERE user_id = ?");
  safeRun("DELETE FROM user_sessions WHERE user_id = ?");
  safeRun("DELETE FROM reset_tokens WHERE user_id = ?");
  safeRun("DELETE FROM api_keys WHERE user_id = ?");
  safeRun("DELETE FROM webhooks WHERE user_id = ?");

  try {
    db.prepare(
      `UPDATE clients SET name = ?, email = NULL, phone = NULL, contact_person = NULL, contact_role = NULL,
         tax_id = NULL, address = NULL, city = NULL, state = NULL, country = NULL,
         website = NULL, linkedin = NULL, instagram = NULL, notes = NULL
       WHERE user_id = ?`,
    ).run(clientName, userId);
  } catch { /* schema variant */ }
  try { db.prepare("UPDATE interactions SET subject = NULL, notes = NULL WHERE user_id = ?").run(userId); } catch { /* */ }
  try { db.prepare("UPDATE proposals SET accepted_by_name = NULL, accepted_ip = NULL, accepted_user_agent = NULL WHERE user_id = ?").run(userId); } catch { /* */ }
  try { db.prepare("UPDATE meetings SET location = NULL, notes = NULL WHERE user_id = ?").run(userId); } catch { /* */ }

  db.prepare(
    `UPDATE users SET email = ?, name = ?, phone = NULL, avatar_url = NULL, studio_name = NULL, studio_role = NULL,
       github_id = NULL, supabase_id = NULL, password_hash = ?, two_factor_enabled = 0, two_factor_secret = NULL,
       backup_codes = '[]', must_reset_password = 1, disabled = 1
     WHERE id = ?`,
  ).run(placeholderEmail, placeholderName, `anonymized-${randomToken()}`, userId);

  await removeSupabaseAuthUser(userRow?.supabase_id);
  logger.info({ userId }, "[LGPD] Usuário anonimizado (SQLite)");
}

function randomToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

async function removeStorageObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { removeProjectFile } = await import("./supabaseStorage.js");
    await Promise.allSettled(paths.filter(Boolean).map((p) => removeProjectFile(p)));
  } catch (err) {
    logger.warn({ err }, "[LGPD] Falha ao remover objetos do storage (seguindo)");
  }
}

/**
 * Processa uma solicitação LGPD (admin only).
 * Ao concluir uma solicitação de EXCLUSÃO, executa a anonimização irreversível
 * do titular — respeitando a janela de carência (DELETE_GRACE_DAYS) contada a
 * partir da criação da solicitação.
 */
export async function processLgpdRequest(
  requestId: string,
  status: "completed" | "rejected",
  processedBy: string,
  notes?: string
): Promise<void> {
  const request = await getLgpdRequest(requestId);
  if (!request) throw new AppError("Solicitação LGPD não encontrada.", 404);
  // Capture destination before an eventual anonymization removes it from the
  // database. It is only held in memory long enough for the final notice.
  const recipient = await getPrivacyEmailRecipient(request.userId);

  if (request.type === "delete" && status === "completed") {
    const createdMs = parseRequestCreatedAt(request.createdAt).getTime();
    const readyMs = createdMs + DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000;
    if (Number.isFinite(createdMs) && Date.now() < readyMs) {
      const readyDate = new Date(readyMs).toISOString().slice(0, 10);
      throw new AppError(
        `Exclusão em período de carência. Poderá ser executada a partir de ${readyDate} (${DELETE_GRACE_DAYS} dias).`,
        409,
      );
    }
    await anonymizeUser(request.userId);
  }

  if (shouldUsePrisma) {
    await prisma.lgpdRequest.update({
      where: { id: requestId },
      data: {
        status,
        processedAt: new Date(),
        processedBy,
        notes,
      },
    });
  } else {
    db.prepare(
      `UPDATE lgpd_requests
       SET status = ?, processed_at = datetime('now'), processed_by = ?, notes = ?
       WHERE id = ?`
    ).run(status, processedBy, notes || null, requestId);
  }

  logger.info({ requestId, status, processedBy, type: request.type }, "[LGPD] Solicitação processada");

  if (recipient && isEmailConfigured) {
    sendPrivacyRequestResolvedEmail({
      to: recipient.email,
      name: recipient.name,
      locale: recipient.locale,
      type: request.type,
      status,
      requestId,
      appUrl: getClientOrigin(),
    }).catch((err) => {
      logger.warn({ err, requestId, status }, "[LGPD] Falha ao enviar e-mail de resolução");
    });
  }
}

// ────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────

export default {
  calculateDataStats,
  exportUserData,
  anonymizeUser,
  savePrivacySettings,
  getPrivacySettings,
  createLgpdRequest,
  listUserLgpdRequests,
  processLgpdRequest,
};
