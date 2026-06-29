import { SITE_CONFIG } from "@shared/site";

export interface StudioSettings {
  studioName: string;
  legalName: string;
  document: string;
  email: string;
  phone: string;
  city: string;
  website: string;
  signature: string;
  primaryColor: string;
}

export const STUDIO_SETTINGS_KEY = "frame.studio.settings.v1";

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  studioName: SITE_CONFIG.title,
  legalName: "",
  document: "",
  email: "",
  phone: "",
  city: "",
  website: "",
  signature: "Responsavel comercial",
  primaryColor: "#ff4d1d",
};

export function readStudioSettings(): StudioSettings {
  if (typeof window === "undefined") return DEFAULT_STUDIO_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STUDIO_SETTINGS_KEY);
    return raw ? { ...DEFAULT_STUDIO_SETTINGS, ...JSON.parse(raw) } : DEFAULT_STUDIO_SETTINGS;
  } catch {
    return DEFAULT_STUDIO_SETTINGS;
  }
}

export function saveStudioSettings(settings: StudioSettings) {
  window.localStorage.setItem(STUDIO_SETTINGS_KEY, JSON.stringify(settings));
}
