import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as webhookService from "../services/webhookService.js";

export const listEvents: RequestHandler = (_req, res) => {
  res.json({ success: true, data: webhookService.WEBHOOK_EVENTS });
};

export const listWebhooks: RequestHandler = async (req, res, next) => {
  try {
    const webhooks = await webhookService.listWebhooks(req.user!.id);
    res.json({ success: true, data: webhooks });
  } catch (e) {
    next(e);
  }
};

export const createWebhook: RequestHandler = async (req, res, next) => {
  try {
    const { url, label, events } = req.body as { url?: string; label?: string; events?: string[] };

    if (!url?.trim()) throw new AppError("URL é obrigatória", 400);
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new AppError("URL deve usar http:// ou https://", 400);
      }
    } catch {
      throw new AppError("URL inválida", 400);
    }
    if (!Array.isArray(events) || events.length === 0) {
      throw new AppError("Selecione ao menos um evento", 400);
    }
    const validEventIds = webhookService.WEBHOOK_EVENTS.map((e) => e.id);
    if (events.some((event) => !validEventIds.includes(event as any))) {
      throw new AppError("Evento inválido", 400);
    }

    const webhook = await webhookService.createWebhook(req.user!.id, url.trim(), label?.trim() ?? "", events);
    res.status(201).json({ success: true, data: webhook });
  } catch (e) {
    next(e);
  }
};

export const updateWebhook: RequestHandler = async (req, res, next) => {
  try {
    const webhookId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(webhookId)) throw new AppError("ID inválido", 400);

    const { url, label, events, active } = req.body as {
      url?: string; label?: string; events?: string[]; active?: boolean;
    };

    const updated = await webhookService.updateWebhook(req.user!.id, webhookId, { url, label, events, active });
    if (!updated) throw new AppError("Webhook não encontrado", 404);

    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};

export const deleteWebhook: RequestHandler = async (req, res, next) => {
  try {
    const webhookId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(webhookId)) throw new AppError("ID inválido", 400);

    const deleted = await webhookService.deleteWebhook(req.user!.id, webhookId);
    if (!deleted) throw new AppError("Webhook não encontrado", 404);

    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};

export const listDeliveries: RequestHandler = async (req, res, next) => {
  try {
    const webhookId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(webhookId)) throw new AppError("ID inválido", 400);

    const deliveries = await webhookService.listDeliveries(req.user!.id, webhookId);
    res.json({ success: true, data: deliveries });
  } catch (e) {
    next(e);
  }
};

export const testWebhook: RequestHandler = async (req, res, next) => {
  try {
    const webhookId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(webhookId)) throw new AppError("ID inválido", 400);

    const result = await webhookService.sendTestPing(req.user!.id, webhookId);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};
