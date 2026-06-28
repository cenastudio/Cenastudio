import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import {
  COOKIE_NAME,
  cookieOptions,
  signToken,
} from "../middleware/authenticate.js";
import * as authService from "../services/authService.js";

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

export const login: RequestHandler = (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = authService.loginUser(email, password);
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.json({ success: true, data: { user } });
  } catch (e) {
    next(e);
  }
};

export const register: RequestHandler = (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const user = authService.registerUser(name, email, password);
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.status(201).json({ success: true, data: { user } });
  } catch (e) {
    next(e);
  }
};

export const forgotPassword: RequestHandler = (req, res, next) => {
  try {
    authService.createResetToken(req.body.email);
    res.json({
      success: true,
      data: { message: "Se o e-mail existir, você receberá as instruções." },
    });
  } catch (e) {
    next(e);
  }
};

export const resetPassword: RequestHandler = (req, res, next) => {
  try {
    authService.resetPassword(req.body.token, req.body.password);
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
    const user = authService.upsertOAuthUser(supabaseUser.email, name, {
      role: supabaseUser.app_metadata?.role,
      planId: supabaseUser.app_metadata?.plan_id,
      supabaseId: supabaseUser.id,
    });
    const token = signToken(user);
    const plan = authService.formatUserPlan(authService.getUserPlan(user.id));
    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.json({ success: true, data: { user, plan } });
  } catch (e) {
    next(e);
  }
};

export const me: RequestHandler = (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const user = authService.getUserById(req.user.id) || req.user;
    const planRow = authService.getUserPlan(req.user.id);
    const plan = authService.formatUserPlan(planRow);
    res.json({ success: true, data: { user, plan } });
  } catch (e) {
    next(e);
  }
};

export const updateProfile: RequestHandler = (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const user = authService.updateProfile(req.user.id, {
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
    res.redirect("/dashboard");
  } catch (e) {
    next(e);
  }
};
