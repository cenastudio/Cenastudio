import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { sendEmail, isEmailConfigured } from "../services/emailService.js";

const CONTACT_EMAIL = "cenastudio@atomicmail.io";

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
      `Nova mensagem de contato — ${name}`,
      `<p><strong>Nome:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p>${phone ? `<p><strong>Telefone:</strong> ${phone}</p>` : ""}<p><strong>Mensagem:</strong></p><p>${message}</p>`,
      email,
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
      `Nova solicitação de demo — ${name}`,
      `<p><strong>Nome:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p>`,
      email,
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
