import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as stripeService from "../services/stripeService.js";

function getClientOrigin() {
  const configured = process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173");
  if (!configured) throw new AppError("Origem pública não configurada.", 503);
  try {
    const url = new URL(configured);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error("invalid protocol");
    return url.origin;
  } catch {
    throw new AppError("Origem pública inválida.", 503);
  }
}

export const createSession: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw new AppError("Unauthorized", 401);
    const { planId } = req.body as { planId?: string };
    if (!planId || !["pro", "studio"].includes(planId)) {
      throw new AppError("Plano inválido.", 400);
    }

    const origin = getClientOrigin();
    const successUrl = new URL("/success", origin);
    successUrl.searchParams.set("plan", planId);
    const cancelUrl = new URL("/", origin);
    cancelUrl.hash = "pricing";
    const session = await stripeService.createCheckoutSession(
      user.id,
      user.email,
      planId,
      successUrl.toString(),
      cancelUrl.toString(),
    );

    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    next(err);
  }
};

export const createPortal: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw new AppError("Unauthorized", 401);
    const origin = getClientOrigin();
    const session = await stripeService.createPortalSession(user.id, new URL("/tools", origin).toString());
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    next(err);
  }
};

export const syncSession: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw new AppError("Unauthorized", 401);
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) {
      throw new AppError("Session ID é obrigatório.", 400);
    }

    const result = await stripeService.syncCheckoutSession(user.id, sessionId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getInvoices: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) throw new AppError("Unauthorized", 401);
    const history = await stripeService.getBillingHistory(user.id);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};

export const webhook: RequestHandler = async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    if (!sig) {
      throw new AppError("Assinatura do webhook inválida.", 400);
    }
    await stripeService.handleWebhook(req.body as Buffer, sig);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};
