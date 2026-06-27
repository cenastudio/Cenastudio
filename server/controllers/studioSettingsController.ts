import type { RequestHandler } from "express";
import { db } from "../models/db.js";

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
}

const DEFAULT_SETTINGS = {
  studioName: "Cena Studio",
  legalName: "",
  document: "",
  email: "",
  phone: "",
  city: "",
  website: "",
  signature: "Responsavel comercial",
  primaryColor: "#ff4d1d",
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
  };
}

function clean(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 300) : fallback;
}

export const getStudioSettings: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const row = db
      .prepare(
        `SELECT studio_name, legal_name, document, email, phone, city, website, signature, primary_color
         FROM studio_settings WHERE user_id = ?`,
      )
      .get(userId) as StudioSettingsRow | undefined;

    res.json({ success: true, data: toClient(row) });
  } catch (e) {
    next(e);
  }
};

export const updateStudioSettings: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
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
    };

    db.prepare(
      `INSERT INTO studio_settings (
        user_id, studio_name, legal_name, document, email, phone, city, website, signature, primary_color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    );

    res.json({ success: true, data: settings });
  } catch (e) {
    next(e);
  }
};
