import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import {
  COOKIE_NAME,
  cookieOptions,
  signToken,
} from "../middleware/authenticate.js";
import * as authService from "../services/authService.js";
import { isGitHubAuthConfigured } from "../config/passport.js";

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
    const { name, email, password, desiredPlan } = req.body;
    const user = await authService.registerUser(name, email, password, desiredPlan);
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.status(201).json({ success: true, data: { user } });
  } catch (e) {
    next(e);
  }
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    await authService.createResetToken(req.body.email);
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

export const logout: RequestHandler = (_req, res) => {
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
