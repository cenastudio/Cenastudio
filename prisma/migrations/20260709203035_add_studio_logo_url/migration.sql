-- Fase 3 white label: add logo_url column to studio_settings
-- Nullable, no default. Allows per-user logo override on top of APP_LOGO_URL env.
ALTER TABLE "studio_settings" ADD COLUMN "logo_url" TEXT;
