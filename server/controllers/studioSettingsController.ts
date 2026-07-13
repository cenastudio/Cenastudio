import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { SITE_CONFIG } from "@shared/site";

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
  };
}

function clean(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 300) : fallback;
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
      } : DEFAULT_SETTINGS });
      return;
    }
    const row = db
      .prepare(
        `SELECT studio_name, legal_name, document, email, phone, city, website, signature, primary_color, logo_url
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
    const rawLogoUrl = req.body.logoUrl;
    const logoUrl: string | null =
      typeof rawLogoUrl === "string" && rawLogoUrl.trim().length > 0 && rawLogoUrl.length < 2000
        ? rawLogoUrl.trim()
        : null;

    // Validate custom branding access (logo & color)
    const hasCustomBranding = logoUrl !== null || (req.body.primaryColor && req.body.primaryColor !== SITE_CONFIG.primaryColor);
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
      primaryColor: /^#[0-9a-f]{6}$/i.test(String(req.body.primaryColor || ""))
        ? String(req.body.primaryColor)
        : DEFAULT_SETTINGS.primaryColor,
      logoUrl,
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
        user_id, studio_name, legal_name, document, email, phone, city, website, signature, primary_color, logo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    );

    res.json({ success: true, data: settings });
  } catch (e) {
    next(e);
  }
};
