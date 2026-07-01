import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

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
    // NOTE: SMTP integration when SMTP_* env vars are set — for now persist to DB
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
