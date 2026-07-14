import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import {
  COOKIE_NAME,
  cookieOptions,
  signToken,
} from "../middleware/authenticate.js";
import * as authService from "../services/authService.js";
import { isGitHubAuthConfigured } from "../config/passport.js";
import { sendEmail, isEmailConfigured } from "../services/emailService.js";
import { SITE_CONFIG } from "@shared/site";
import { trackSession, hashToken, revokeSession } from "../services/sessionService.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import * as lgpdService from "../services/lgpdService.js";
import * as twoFactorService from "../services/twoFactorService.js";
import * as apiKeyService from "../services/apiKeyService.js";
import * as activityLogService from "../services/activityLogService.js";
import { getUserUsageMetrics } from "../services/entitlementService.js";

function getClientOrigin() {
  return process.env.CLIENT_ORIGIN || "http://localhost:5173";
}

interface SupabaseUserResponse {
  id?: string;
  email?: string;
  app_metadata?: {
    role?: "user" | "admin";
    plan_id?: string;
  };
  user_metadata?: {
    name?: string;
    full_name?: string;
    user_name?: string;
  };
}

export const login: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await authService.loginUser(email, password);
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, cookieOptions);
    trackSession(user.id, token, req.headers["user-agent"], req.ip);
    res.json({ success: true, data: { user } });
  } catch (e) {
    next(e);
  }
};

export const providers: RequestHandler = (_req, res) => {
  res.json({
    success: true,
    data: {
      github: isGitHubAuthConfigured,
      supabase: Boolean(
        (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
        (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      ),
    },
  });
};

export const register: RequestHandler = async (req, res, next) => {
  try {
    const { name, email, password, desiredPlan, referralCode } = req.body;
    const user = await authService.registerUser(name, email, password, desiredPlan);
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, cookieOptions);
    trackSession(user.id, token, req.headers["user-agent"], req.ip);

    // Track referral conversion if code provided
    if (referralCode && typeof referralCode === 'string') {
      try {
        const { trackReferralConversion } = await import("../services/referralService.js");
        const converted = await trackReferralConversion(referralCode, user.id);
        if (converted) {
          console.log(`[Referral] Conversion tracked for code ${referralCode} -> user ${user.id}`);
        }
      } catch (err) {
        // Non-blocking: registration succeeds even if referral tracking fails
        console.error('[Referral] Failed to track conversion:', err);
      }
    }

    res.status(201).json({ success: true, data: { user } });
  } catch (e) {
    next(e);
  }
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim();
    const token = await authService.createResetToken(email);

    // Best-effort: never leak whether the email exists, and never fail the
    // request because the email provider is unavailable.
    if (token && isEmailConfigured) {
      const resetUrl = `${getClientOrigin()}/reset-password?token=${token}`;
      sendEmail({
        to: email,
        subject: `Redefinição de senha — ${SITE_CONFIG.brandName}`,
        html: `
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p>
          <p>Este link expira em 1 hora. Se você não solicitou isso, ignore este email.</p>
        `,
        text: `Redefina sua senha: ${resetUrl} (expira em 1 hora)`,
      }).catch((err) => {
        console.error("[forgotPassword] Falha ao enviar email:", err instanceof Error ? err.message : err);
      });
    }

    res.json({
      success: true,
      data: { message: "Se o e-mail existir, você receberá as instruções." },
    });
  } catch (e) {
    next(e);
  }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({
      success: true,
      data: { message: "Senha redefinida com sucesso." },
    });
  } catch (e) {
    next(e);
  }
};

export const logout: RequestHandler = async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const tokenHash = hashToken(token);
    // No JWT verification here on purpose: logout should always succeed and
    // clear the cookie even if the token is expired/malformed. We only try
    // to mark the matching session row revoked, best-effort.
    try {
      if (shouldUsePrisma) {
        await prisma.userSession.updateMany({
          where: { tokenHash },
          data: { revokedAt: new Date() },
        });
      } else {
        db.prepare("UPDATE user_sessions SET revoked_at = datetime('now') WHERE token_hash = ?").run(tokenHash);
      }
    } catch (error) {
      console.error("[logout] Falha ao revogar sessão:", error);
    }
  }
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ success: true, data: null });
};

export const supabaseLogin: RequestHandler = async (req, res, next) => {
  try {
    const { accessToken } = req.body as { accessToken?: string };
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!accessToken) throw new AppError("Missing Supabase access token", 400);
    if (!supabaseUrl || !supabaseAnonKey) throw new AppError("Supabase is not configured", 503);

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) throw new AppError("Invalid Supabase session", 401);

    const supabaseUser = (await response.json()) as SupabaseUserResponse;
    if (!supabaseUser.email) throw new AppError("GitHub account has no email", 400);

    const name =
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.user_name;
    const user = await authService.upsertOAuthUser(supabaseUser.email, name, {
      role: supabaseUser.app_metadata?.role,
      planId: supabaseUser.app_metadata?.plan_id,
      supabaseId: supabaseUser.id,
    });
    const token = signToken(user);
    const plan = authService.formatUserPlan(await authService.getUserPlan(user.id));
    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.json({ success: true, data: { user, plan } });
  } catch (e) {
    next(e);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const user = (await authService.getUserById(req.user.id)) || req.user;
    const planRow = await authService.getUserPlan(req.user.id);
    const plan = authService.formatUserPlan(planRow);
    res.json({ success: true, data: { user, plan } });
  } catch (e) {
    next(e);
  }
};

export const getUsageMetrics: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const metrics = await getUserUsageMetrics(req.user.id);
    res.json({ success: true, data: metrics });
  } catch (e) {
    next(e);
  }
};

export const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const user = await authService.updateProfile(req.user.id, {
      name: req.body.name,
      studioName: req.body.studioName,
      studioRole: req.body.studioRole,
      phone: req.body.phone,
    });
    res.json({ success: true, data: { user } });
  } catch (e) {
    next(e);
  }
};

export const githubCallback: RequestHandler = (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const token = signToken(req.user);
    res.cookie(COOKIE_NAME, token, cookieOptions);
    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    res.redirect(new URL("/dashboard", clientOrigin).toString());
  } catch (e) {
    next(e);
  }
};

export const changePassword: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError("Senha atual e nova senha são obrigatórias.", 400);
    }
    if (newPassword.length < 6) {
      throw new AppError("A nova senha precisa ter pelo menos 6 caracteres.", 400);
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true, message: "Senha alterada com sucesso." });
  } catch (e) {
    next(e);
  }
};

export const exportUserData: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const userId = req.user.id;

    const user = await authService.getUserById(userId);
    const planRow = await authService.getUserPlan(userId);
    const plan = authService.formatUserPlan(planRow);

    const { db } = await import("../models/db.js");

    const safeQuery = (sql: string, params: unknown[]): unknown[] => {
      try { return (db.prepare(sql).all as (...args: unknown[]) => unknown[])(params[0]); }
      catch { return []; }
    };

    const projects = safeQuery(
      "SELECT id, name, description, status, metadata_json, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    const clients = safeQuery(
      "SELECT id, name, company, email, phone, tax_id, address, city, state, country, industry, created_at FROM clients WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    const generations = safeQuery(
      "SELECT id, tool_id, input, output, created_at, project_id FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT 500",
      [userId]
    );
    const opportunities = safeQuery(
      "SELECT id, title, client_name, value, stage, probability, expected_close, notes, created_at FROM opportunities WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    const interactions = safeQuery(
      "SELECT id, client_id, type, subject, notes, date, created_at FROM interactions WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    const financialEntries = safeQuery(
      "SELECT id, type, description, amount, category, due_date, status, created_at FROM financial_entries WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    const payload = {
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
      notice: "Exportação de dados pessoais conforme LGPD — Art. 18, IV",
      account: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        role: user?.role,
        studioName: user?.studioName,
        studioRole: user?.studioRole,
        phone: user?.phone,
      },
      plan: {
        planId: plan?.planId,
        planName: plan?.planName,
        status: plan?.status,
        generationLimit: plan?.generationLimit,
        trialEndsAt: plan?.trialEndsAt,
      },
      summary: {
        projects: projects.length,
        clients: clients.length,
        generations: generations.length,
        opportunities: opportunities.length,
        interactions: interactions.length,
        financialEntries: financialEntries.length,
      },
      projects,
      clients,
      opportunities,
      interactions,
      financialEntries,
      generationHistory: generations,
    };

    const filename = `cenastudio-dados-${userId}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.json(payload);
  } catch (e) {
    next(e);
  }
};


// ═══════════════════════════════════════════════════════════════
// LGPD / GDPR ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/auth/data-stats
 * Dashboard de transparência de dados (LGPD Art. 9)
 */
export const getDataStats: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const stats = await lgpdService.calculateDataStats(req.user.id);

    res.json({ success: true, data: stats });
  } catch (e) {
    next(e);
  }
};

/**
 * PUT /api/auth/privacy-settings
 * Salvar configurações de privacidade do usuário
 */
export const updatePrivacySettings: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { profileVisibility, allowSearchEngineIndexing, shareAnalyticsWithTeam } = req.body;

    // Validação básica
    if (profileVisibility && !["public", "team", "private"].includes(profileVisibility)) {
      throw new AppError("profileVisibility deve ser 'public', 'team' ou 'private'", 400);
    }

    const settings: lgpdService.PrivacySettings = {
      profileVisibility: profileVisibility || "team",
      allowSearchEngineIndexing: allowSearchEngineIndexing !== false,
      shareAnalyticsWithTeam: shareAnalyticsWithTeam !== false,
    };

    await lgpdService.savePrivacySettings(req.user.id, settings);

    res.json({ success: true, data: { message: "Configurações de privacidade atualizadas" } });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/auth/privacy-settings
 * Obter configurações de privacidade do usuário
 */
export const getPrivacySettings: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const settings = await lgpdService.getPrivacySettings(req.user.id);

    res.json({ success: true, data: settings });
  } catch (e) {
    next(e);
  }
};

/**
 * POST /api/auth/lgpd-request
 * Criar solicitação LGPD/GDPR (cópia, correção ou exclusão de dados)
 * Implementa LGPD Art. 18 (Direitos do titular)
 */
export const createLgpdRequest: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { type } = req.body;

    if (!type || !["copy", "correct", "delete"].includes(type)) {
      throw new AppError("type deve ser 'copy', 'correct' ou 'delete'", 400);
    }

    const result = await lgpdService.createLgpdRequest(
      req.user.id,
      type as lgpdService.LgpdRequestType,
      req.user.email,
      req.user.name || null
    );

    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/auth/lgpd-requests
 * Listar solicitações LGPD do usuário
 */
export const listLgpdRequests: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const requests = await lgpdService.listUserLgpdRequests(req.user.id);

    res.json({ success: true, data: { requests } });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/auth/export-data
 * Exporta imediatamente todos os dados do titular como um arquivo JSON para
 * download. Atende de fato ao direito de acesso/portabilidade
 * (LGPD Art. 18, II e V / GDPR Art. 15 e 20) — sem depender de processamento
 * manual posterior.
 */
export const exportData: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const data = await lgpdService.exportUserData(req.user.id);
    const filename = `cenastudio-dados-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(JSON.stringify(data, null, 2));
  } catch (e) {
    next(e);
  }
};


// ═══════════════════════════════════════════════════════════════
// SECURITY ADVANCED: 2FA
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/auth/2fa/setup
 * Gera QR Code e secret TOTP para configurar 2FA
 */
export const setup2FA: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const result = await twoFactorService.setup2FA(
      req.user.id,
      req.user.email,
      req.user.name || null
    );

    // Log da ação
    activityLogService.logAction(
      req.user.id,
      "2FA setup iniciado",
      req.ip,
      req.headers["user-agent"]
    ).catch((err) => console.error("[Activity Log] Erro:", err));

    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/**
 * POST /api/auth/2fa/verify
 * Verifica código 2FA e ativa o 2FA se correto
 */
export const verify2FA: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { code } = req.body;

    if (!code || typeof code !== "string" || code.length !== 6) {
      throw new AppError("Código deve ter 6 dígitos", 400);
    }

    const isValid = await twoFactorService.verify2FA(req.user.id, code);

    if (!isValid) {
      throw new AppError("Código inválido", 400);
    }

    // Log da ação
    activityLogService.logAction(
      req.user.id,
      "2FA ativado",
      req.ip,
      req.headers["user-agent"]
    ).catch((err) => console.error("[Activity Log] Erro:", err));

    res.json({ success: true, data: { message: "2FA ativado com sucesso" } });
  } catch (e) {
    next(e);
  }
};

/**
 * POST /api/auth/2fa/disable
 * Desativa 2FA
 */
export const disable2FA: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    await twoFactorService.disable2FA(req.user.id);

    // Log da ação (potencialmente suspeita)
    activityLogService.logAction(
      req.user.id,
      "2FA desativado",
      req.ip,
      req.headers["user-agent"]
    ).catch((err) => console.error("[Activity Log] Erro:", err));

    res.json({ success: true, data: { message: "2FA desativado" } });
  } catch (e) {
    next(e);
  }
};

// ═══════════════════════════════════════════════════════════════
// SECURITY ADVANCED: API KEYS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/auth/api-keys
 * Cria uma nova API Key
 */
export const createApiKey: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new AppError("Nome da chave é obrigatório", 400);
    }

    if (name.length > 100) {
      throw new AppError("Nome muito longo (máximo 100 caracteres)", 400);
    }

    const result = await apiKeyService.createApiKey(req.user.id, name.trim());

    // Log da ação
    activityLogService.logAction(
      req.user.id,
      "API Key criada",
      req.ip,
      req.headers["user-agent"],
      { keyName: name.trim() }
    ).catch((err) => console.error("[Activity Log] Erro:", err));

    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/auth/api-keys
 * Lista todas as API Keys do usuário
 */
export const listApiKeys: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const keys = await apiKeyService.listApiKeys(req.user.id);

    res.json({ success: true, data: { keys } });
  } catch (e) {
    next(e);
  }
};

/**
 * DELETE /api/auth/api-keys/:id
 * Revoga (deleta) uma API Key
 */
export const revokeApiKey: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { id } = req.params;

    if (!id) {
      throw new AppError("ID da chave é obrigatório", 400);
    }

    await apiKeyService.revokeApiKey(req.user.id, id);

    // Log da ação
    activityLogService.logAction(
      req.user.id,
      "API Key revogada",
      req.ip,
      req.headers["user-agent"],
      { keyId: id }
    ).catch((err) => console.error("[Activity Log] Erro:", err));

    res.json({ success: true, data: { message: "API Key revogada" } });
  } catch (e) {
    next(e);
  }
};

// ═══════════════════════════════════════════════════════════════
// SECURITY ADVANCED: ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/auth/activity
 * Lista atividades do usuário (últimos 30 dias)
 */
export const getActivityLog: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const limit = parseInt(req.query.limit as string) || 50;
    const days = parseInt(req.query.days as string) || 30;

    // Validação
    if (limit > 100) {
      throw new AppError("Limite máximo: 100 itens", 400);
    }

    if (days > 90) {
      throw new AppError("Período máximo: 90 dias", 400);
    }

    const activities = await activityLogService.listUserActivities(
      req.user.id,
      limit,
      days
    );

    res.json({ success: true, data: { activities } });
  } catch (e) {
    next(e);
  }
};

// ═══════════════════════════════════════════════════════════════
// SECURITY ADVANCED: SECURITY ALERTS
// ═══════════════════════════════════════════════════════════════

/**
 * PUT /api/auth/security-alerts
 * Atualiza preferências de alertas de segurança
 */
export const updateSecurityAlerts: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { emailOnNewLogin, emailOnPasswordChange, emailOnNewDevice } = req.body;

    const alerts = {
      emailOnNewLogin: emailOnNewLogin !== false,
      emailOnPasswordChange: emailOnPasswordChange !== false,
      emailOnNewDevice: emailOnNewDevice !== false,
    };

    // Salvar no banco
    if (shouldUsePrisma) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { securityAlerts: alerts as any },
      });
    } else {
      db.prepare(
        "UPDATE users SET security_alerts = ? WHERE id = ?"
      ).run(JSON.stringify(alerts), req.user.id);
    }

    res.json({ success: true, data: { message: "Alertas de segurança atualizados" } });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/auth/security-alerts
 * Obtém preferências de alertas de segurança
 */
export const getSecurityAlerts: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    let alerts = {
      emailOnNewLogin: true,
      emailOnPasswordChange: true,
      emailOnNewDevice: true,
    };

    if (shouldUsePrisma) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { securityAlerts: true },
      });
      if (user?.securityAlerts) {
        alerts = user.securityAlerts as any;
      }
    } else {
      const row = db.prepare(
        "SELECT security_alerts FROM users WHERE id = ?"
      ).get(req.user.id) as { security_alerts: string } | undefined;
      if (row?.security_alerts) {
        alerts = JSON.parse(row.security_alerts);
      }
    }

    res.json({ success: true, data: alerts });
  } catch (e) {
    next(e);
  }
};


// ═══════════════════════════════════════════════════════════════
// PREFERENCES ADVANCED (SPRINT 3)
// ═══════════════════════════════════════════════════════════════

/**
 * PUT /api/auth/notification-preferences
 * Atualiza preferências de notificações (8 tipos)
 */
export const updateNotificationPreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const prefs = {
      newComments: req.body.newComments !== false,
      clientUploads: req.body.clientUploads !== false,
      projectDeadlines: req.body.projectDeadlines !== false,
      weeklyNewsletter: req.body.weeklyNewsletter === true,
      mentions: req.body.mentions !== false,
      newProjects: req.body.newProjects === true,
      reviewApproved: req.body.reviewApproved !== false,
      paymentSuccess: req.body.paymentSuccess !== false,
    };

    if (shouldUsePrisma) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { notificationPrefs: prefs as any },
      });
    } else {
      db.prepare(
        "UPDATE users SET notification_prefs = ? WHERE id = ?"
      ).run(JSON.stringify(prefs), req.user.id);
    }

    res.json({ success: true, data: { message: "Preferências de notificação atualizadas" } });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/auth/notification-preferences
 * Obtém preferências de notificações
 */
export const getNotificationPreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    let prefs = {
      newComments: true,
      clientUploads: true,
      projectDeadlines: true,
      weeklyNewsletter: false,
      mentions: true,
      newProjects: false,
      reviewApproved: true,
      paymentSuccess: true,
    };

    if (shouldUsePrisma) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { notificationPrefs: true },
      });
      if (user?.notificationPrefs) {
        prefs = user.notificationPrefs as any;
      }
    } else {
      const row = db.prepare(
        "SELECT notification_prefs FROM users WHERE id = ?"
      ).get(req.user.id) as { notification_prefs: string } | undefined;
      if (row?.notification_prefs) {
        prefs = JSON.parse(row.notification_prefs);
      }
    }

    res.json({ success: true, data: prefs });
  } catch (e) {
    next(e);
  }
};

/**
 * PUT /api/auth/regional-preferences
 * Atualiza preferências regionais (fuso, data, moeda)
 */
export const updateRegionalPreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { locale, timezone, dateFormat, currency } = req.body;

    // Validações
    if (locale && !["pt", "en"].includes(locale)) {
      throw new AppError("locale deve ser 'pt' ou 'en'", 400);
    }

    if (dateFormat && !["DD/MM/YYYY", "MM/DD/YYYY"].includes(dateFormat)) {
      throw new AppError("dateFormat deve ser 'DD/MM/YYYY' ou 'MM/DD/YYYY'", 400);
    }

    if (currency && !["BRL", "USD", "EUR"].includes(currency)) {
      throw new AppError("currency deve ser 'BRL', 'USD' ou 'EUR'", 400);
    }

    const prefs = {
      locale: locale || "pt",
      timezone: timezone || "America/Sao_Paulo",
      dateFormat: dateFormat || "DD/MM/YYYY",
      currency: currency || "BRL",
    };

    if (shouldUsePrisma) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { regionalPrefs: prefs as any },
      });
    } else {
      db.prepare(
        "UPDATE users SET regional_prefs = ? WHERE id = ?"
      ).run(JSON.stringify(prefs), req.user.id);
    }

    res.json({ success: true, data: { message: "Preferências regionais atualizadas" } });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/auth/regional-preferences
 * Obtém preferências regionais
 */
export const getRegionalPreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    let prefs = {
      locale: "pt",
      timezone: "America/Sao_Paulo",
      dateFormat: "DD/MM/YYYY",
      currency: "BRL",
    };

    if (shouldUsePrisma) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { regionalPrefs: true },
      });
      if (user?.regionalPrefs) {
        prefs = user.regionalPrefs as any;
      }
    } else {
      const row = db.prepare(
        "SELECT regional_prefs FROM users WHERE id = ?"
      ).get(req.user.id) as { regional_prefs: string } | undefined;
      if (row?.regional_prefs) {
        prefs = JSON.parse(row.regional_prefs);
      }
    }

    res.json({ success: true, data: prefs });
  } catch (e) {
    next(e);
  }
};

/**
 * PUT /api/auth/visual-preferences
 * Atualiza preferências visuais (tema, densidade, fonte, animações)
 */
export const updateVisualPreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { themeMode, density, fontFamily, reduceAnimations } = req.body;

    // Validações
    if (themeMode && !["dark", "light", "auto"].includes(themeMode)) {
      throw new AppError("themeMode deve ser 'dark', 'light' ou 'auto'", 400);
    }

    if (density && !["compact", "normal", "spacious"].includes(density)) {
      throw new AppError("density deve ser 'compact', 'normal' ou 'spacious'", 400);
    }

    if (fontFamily && !["inter", "system", "mono"].includes(fontFamily)) {
      throw new AppError("fontFamily deve ser 'inter', 'system' ou 'mono'", 400);
    }

    const prefs = {
      themeMode: themeMode || "dark",
      density: density || "normal",
      fontFamily: fontFamily || "inter",
      reduceAnimations: reduceAnimations === true,
    };

    if (shouldUsePrisma) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { visualPrefs: prefs as any },
      });
    } else {
      db.prepare(
        "UPDATE users SET visual_prefs = ? WHERE id = ?"
      ).run(JSON.stringify(prefs), req.user.id);
    }

    res.json({ success: true, data: { message: "Preferências visuais atualizadas" } });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/auth/visual-preferences
 * Obtém preferências visuais
 */
export const getVisualPreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    let prefs = {
      themeMode: "dark",
      density: "normal",
      fontFamily: "inter",
      reduceAnimations: false,
    };

    if (shouldUsePrisma) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { visualPrefs: true },
      });
      if (user?.visualPrefs) {
        prefs = user.visualPrefs as any;
      }
    } else {
      const row = db.prepare(
        "SELECT visual_prefs FROM users WHERE id = ?"
      ).get(req.user.id) as { visual_prefs: string } | undefined;
      if (row?.visual_prefs) {
        prefs = JSON.parse(row.visual_prefs);
      }
    }

    res.json({ success: true, data: prefs });
  } catch (e) {
    next(e);
  }
};

/**
 * PUT /api/auth/behavior-preferences
 * Atualiza comportamentos padrão (ordenação, view, autoplay)
 */
export const updateBehaviorPreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { defaultProjectSort, defaultView, autoplayVideos } = req.body;

    // Validações
    if (defaultProjectSort && !["recent", "alphabetical", "deadline"].includes(defaultProjectSort)) {
      throw new AppError("defaultProjectSort deve ser 'recent', 'alphabetical' ou 'deadline'", 400);
    }

    if (defaultView && !["grid", "list"].includes(defaultView)) {
      throw new AppError("defaultView deve ser 'grid' ou 'list'", 400);
    }

    const prefs = {
      defaultProjectSort: defaultProjectSort || "recent",
      defaultView: defaultView || "grid",
      autoplayVideos: autoplayVideos !== false,
    };

    if (shouldUsePrisma) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { behaviorPrefs: prefs as any },
      });
    } else {
      db.prepare(
        "UPDATE users SET behavior_prefs = ? WHERE id = ?"
      ).run(JSON.stringify(prefs), req.user.id);
    }

    res.json({ success: true, data: { message: "Comportamentos padrão atualizados" } });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/auth/behavior-preferences
 * Obtém comportamentos padrão
 */
export const getBehaviorPreferences: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);

    let prefs = {
      defaultProjectSort: "recent",
      defaultView: "grid",
      autoplayVideos: true,
    };

    if (shouldUsePrisma) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { behaviorPrefs: true },
      });
      if (user?.behaviorPrefs) {
        prefs = user.behaviorPrefs as any;
      }
    } else {
      const row = db.prepare(
        "SELECT behavior_prefs FROM users WHERE id = ?"
      ).get(req.user.id) as { behavior_prefs: string } | undefined;
      if (row?.behavior_prefs) {
        prefs = JSON.parse(row.behavior_prefs);
      }
    }

    res.json({ success: true, data: prefs });
  } catch (e) {
    next(e);
  }
};
