-- ═══════════════════════════════════════════════════════════════
-- SPRINT 2: Security Advanced
-- Features: 2FA, API Keys, Activity Log, Security Alerts
-- ═══════════════════════════════════════════════════════════════

-- AlterTable: Adicionar campos de 2FA e Security Alerts ao User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_secret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "backup_codes" JSONB DEFAULT '[]';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "security_alerts" JSONB DEFAULT '{"emailOnNewLogin":true,"emailOnPasswordChange":true,"emailOnNewDevice":true}';

-- CreateTable: api_keys
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "last_used" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: activity_logs
CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "ip_address" TEXT,
    "location" TEXT,
    "user_agent" TEXT,
    "suspicious" BOOLEAN NOT NULL DEFAULT FALSE,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "idx_api_keys_user_id" ON "api_keys"("user_id");
CREATE INDEX IF NOT EXISTS "idx_api_keys_key_hash" ON "api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_user_id" ON "activity_logs"("user_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_timestamp" ON "activity_logs"("timestamp");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_suspicious" ON "activity_logs"("suspicious");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comentários
COMMENT ON TABLE "api_keys" IS 'Chaves de API para integrações externas (webhooks, scripts, automações)';
COMMENT ON COLUMN "api_keys"."key_hash" IS 'SHA-256 hash da chave completa para validação';
COMMENT ON COLUMN "api_keys"."key_prefix" IS 'Primeiros 20 caracteres da chave para exibição (e.g., cena_abc123xyz...)';
COMMENT ON TABLE "activity_logs" IS 'Log de auditoria de ações do usuário (últimos 30-90 dias)';
COMMENT ON COLUMN "activity_logs"."suspicious" IS 'Flag automática: login de novo IP, novo dispositivo, ação anormal';
COMMENT ON COLUMN "users"."two_factor_enabled" IS 'Indica se 2FA (TOTP) está ativado';
COMMENT ON COLUMN "users"."two_factor_secret" IS 'Secret TOTP para Google Authenticator/Authy (base32)';
COMMENT ON COLUMN "users"."backup_codes" IS 'Array de códigos de backup one-time (hashed)';
COMMENT ON COLUMN "users"."security_alerts" IS 'Preferências de notificações de segurança';
