import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { sendEmail, isEmailConfigured } from "../services/emailService.js";

const CONTACT_EMAIL = "cenastudio@atomicmail.io";

/**
 * Escape user-controlled text before interpolating it into the notification
 * HTML. The contact/demo forms are public and unauthenticated, so their fields
 * must never be trusted as markup — otherwise a submitter could inject
 * arbitrary HTML (links, styles, tracking pixels) into the email that reaches
 * the studio inbox.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Collapse a value to a single safe line for use in an email Subject header. */
function toSubjectText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Best-effort internal notification — a failure here must never break the public form. */
function notifyStudio(subject: string, html: string, replyTo?: string) {
  if (!isEmailConfigured) return;
  sendEmail({ to: CONTACT_EMAIL, subject, html, replyTo }).catch((err) => {
    console.error("[contact] Falha ao notificar estúdio:", err instanceof Error ? err.message : err);
  });
}

export const submitContact: RequestHandler = async (req, res, next) => {
  try {
    const { name, email, phone, message, type } = req.body;
    if (shouldUsePrisma) {
      await prisma.contact.create({ data: { name, email, phone: phone ?? null, message, type } });
    } else {
    db.prepare(
      "INSERT INTO contacts (name, email, phone, message, type) VALUES (?, ?, ?, ?, ?)",
    ).run(name, email, phone ?? null, message, type);
    }
    notifyStudio(
      `Nova mensagem de contato — ${toSubjectText(name)}`,
      `<p><strong>Nome:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p>${phone ? `<p><strong>Telefone:</strong> ${escapeHtml(phone)}</p>` : ""}<p><strong>Mensagem:</strong></p><p>${escapeHtml(message)}</p>`,
      typeof email === "string" ? email : undefined,
    );
    res.status(201).json({
      success: true,
      data: { message: "Mensagem recebida com sucesso. Entraremos em contato em breve." },
    });
  } catch (e) {
    next(e);
  }
};

export const submitDemo: RequestHandler = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (shouldUsePrisma) {
      await prisma.contact.create({ data: { name, email, message: `Demo request from ${email}`, type: "demo" } });
    } else {
    db.prepare(
      "INSERT INTO contacts (name, email, message, type) VALUES (?, ?, ?, 'demo')",
    ).run(name, email, `Demo request from ${email}`);
    }
    notifyStudio(
      `Nova solicitação de demo — ${toSubjectText(name)}`,
      `<p><strong>Nome:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p>`,
      typeof email === "string" ? email : undefined,
    );
    res.json({
      success: true,
      data: { message: "Demo agendada! Enviaremos confirmação por email." },
    });
  } catch (e) {
    next(e);
  }
};

export function requireEnvOrThrow() {
  if (!process.env.JWT_SECRET) {
    throw new AppError("JWT_SECRET environment variable is required", 500);
  }
}
