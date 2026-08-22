import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { SITE_CONFIG } from "@shared/site";
import { AppError } from "../middleware/errorHandler.js";
import { uploadBrandAsset } from "../services/supabaseStorage.js";

interface StudioSettingsRow {
  studio_name: string;
  legal_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  website: string | null;
  signature: string | null;
  primary_color: string | null;
  logo_url: string | null;
  default_hourly_rate: number | null;
}

const DEFAULT_SETTINGS = {
  studioName: SITE_CONFIG.brandName,
  legalName: "",
  document: "",
  email: "",
  phone: "",
  city: "",
  website: "",
  signature: "Responsavel comercial",
  primaryColor: SITE_CONFIG.primaryColor,
  logoUrl: null as string | null,
  defaultHourlyRate: null as number | null,
};

function toClient(row?: StudioSettingsRow | null) {
  if (!row) return DEFAULT_SETTINGS;
  return {
    studioName: row.studio_name || DEFAULT_SETTINGS.studioName,
    legalName: row.legal_name || "",
    document: row.document || "",
    email: row.email || "",
    phone: row.phone || "",
    city: row.city || "",
    website: row.website || "",
    signature: row.signature || DEFAULT_SETTINGS.signature,
    primaryColor: row.primary_color || DEFAULT_SETTINGS.primaryColor,
    logoUrl: row.logo_url ?? null,
    defaultHourlyRate: row.default_hourly_rate ?? null,
  };
}

function clean(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 300) : fallback;
}

function isValidLogoUrl(value: string) {
  if (value.length >= 2000) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("\\");
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeLogoUrl(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new AppError("Logo URL inválida", 400);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isValidLogoUrl(trimmed)) throw new AppError("Logo URL deve ser uma URL http(s) ou path relativo", 400);
  return trimmed;
}

function normalizeHourlyRate(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100_000_000) {
    throw new AppError("Taxa horária inválida", 400);
  }
  return Math.round(parsed);
}

export const getStudioSettings: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const row = await prisma.studioSetting.findUnique({ where: { userId: BigInt(userId) } });
      res.json({ success: true, data: row ? {
        studioName: row.studioName, legalName: row.legalName, document: row.document,
        email: row.email, phone: row.phone, city: row.city, website: row.website,
        signature: row.signature, primaryColor: row.primaryColor,
        logoUrl: row.logoUrl ?? null,
        defaultHourlyRate: row.defaultHourlyRate ?? null,
      } : DEFAULT_SETTINGS });
      return;
    }
    const row = db
      .prepare(
        `SELECT studio_name, legal_name, document, email, phone, city, website, signature, primary_color, logo_url, default_hourly_rate
         FROM studio_settings WHERE user_id = ?`,
      )
      .get(userId) as StudioSettingsRow | undefined;

    res.json({ success: true, data: toClient(row) });
  } catch (e) {
    next(e);
  }
};

export const updateStudioSettings: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const logoUrl = normalizeLogoUrl(req.body.logoUrl);

    // Validate the color first, then gate on the *validated* value. An
    // invalid string (e.g. "not-a-color") falls back to the default and must
    // NOT count as custom branding — only a valid color that actually differs
    // from the default, or a logo, requires the customBranding entitlement.
    const validatedPrimaryColor = /^#[0-9a-f]{6}$/i.test(String(req.body.primaryColor || ""))
      ? String(req.body.primaryColor)
      : DEFAULT_SETTINGS.primaryColor;

    const hasCustomBranding = logoUrl !== null || validatedPrimaryColor !== DEFAULT_SETTINGS.primaryColor;
    if (hasCustomBranding) {
      // This will throw 402 if user doesn't have customBranding entitlement
      const { requireFeature } = await import("../services/entitlementService.js");
      await requireFeature(userId, req.user!.role, "customBranding");
    }

    const settings = {
      studioName: clean(req.body.studioName, DEFAULT_SETTINGS.studioName) || DEFAULT_SETTINGS.studioName,
      legalName: clean(req.body.legalName),
      document: clean(req.body.document),
      email: clean(req.body.email),
      phone: clean(req.body.phone),
      city: clean(req.body.city),
      website: clean(req.body.website),
      signature: clean(req.body.signature, DEFAULT_SETTINGS.signature) || DEFAULT_SETTINGS.signature,
      primaryColor: validatedPrimaryColor,
      logoUrl,
      defaultHourlyRate: normalizeHourlyRate(req.body.defaultHourlyRate),
    };

    if (shouldUsePrisma) {
      await prisma.studioSetting.upsert({
        where: { userId: BigInt(userId) },
        create: { userId: BigInt(userId), ...settings },
        update: { ...settings, updatedAt: new Date() },
      });
      res.json({ success: true, data: settings });
      return;
    }

    db.prepare(
      `INSERT INTO studio_settings (
        user_id, studio_name, legal_name, document, email, phone, city, website, signature, primary_color, logo_url, default_hourly_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        studio_name = excluded.studio_name,
        legal_name = excluded.legal_name,
        document = excluded.document,
        email = excluded.email,
        phone = excluded.phone,
        city = excluded.city,
        website = excluded.website,
        signature = excluded.signature,
        primary_color = excluded.primary_color,
        logo_url = excluded.logo_url,
        default_hourly_rate = excluded.default_hourly_rate,
        updated_at = datetime('now')`,
    ).run(
      userId,
      settings.studioName,
      settings.legalName,
      settings.document,
      settings.email,
      settings.phone,
      settings.city,
      settings.website,
      settings.signature,
      settings.primaryColor,
      settings.logoUrl,
      settings.defaultHourlyRate,
    );

    res.json({ success: true, data: settings });
  } catch (e) {
    next(e);
  }
};

const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);
const MAX_LOGO_SIZE = 5 * 1024 * 1024;

export const uploadStudioLogo: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { fileData, filename, mimeType } = req.body as {
      fileData?: unknown;
      filename?: unknown;
      mimeType?: unknown;
    };
    if (typeof fileData !== "string" || !fileData.trim()) throw new AppError("Arquivo do logo é obrigatório", 400);
    if (typeof filename !== "string" || !filename.trim()) throw new AppError("Nome do arquivo é obrigatório", 400);
    if (typeof mimeType !== "string" || !ALLOWED_LOGO_TYPES.has(mimeType)) {
      throw new AppError("Formato de logo inválido. Use PNG, JPEG, SVG ou WebP.", 400);
    }

    const buffer = Buffer.from(fileData.replace(/^data:[^;]+;base64,/, ""), "base64");
    if (!buffer.length) throw new AppError("Arquivo do logo está vazio", 400);
    if (buffer.length > MAX_LOGO_SIZE) throw new AppError("Logo excede o limite de 5MB", 413);

    const { publicUrl } = await uploadBrandAsset({
      userId,
      filename: filename.trim(),
      body: buffer,
      contentType: mimeType,
    });

    if (shouldUsePrisma) {
      await prisma.studioSetting.upsert({
        where: { userId: BigInt(userId) },
        create: { userId: BigInt(userId), ...DEFAULT_SETTINGS, logoUrl: publicUrl },
        update: { logoUrl: publicUrl, updatedAt: new Date() },
      });
    } else {
      db.prepare(
        `INSERT INTO studio_settings (user_id, studio_name, signature, primary_color, logo_url)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET logo_url = excluded.logo_url, updated_at = datetime('now')`,
      ).run(userId, DEFAULT_SETTINGS.studioName, DEFAULT_SETTINGS.signature, DEFAULT_SETTINGS.primaryColor, publicUrl);
    }

    res.json({ success: true, data: { logoUrl: publicUrl } });
  } catch (e) {
    next(e);
  }
};
