-- AlterTable: Adicionar campo privacy_settings ao User
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privacy_settings" JSONB DEFAULT '{"profileVisibility":"team","allowSearchEngineIndexing":true,"shareAnalyticsWithTeam":true}';

-- CreateTable: lgpd_requests
CREATE TABLE IF NOT EXISTS "lgpd_requests" (
    "id" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,
    "processed_by" TEXT,

    CONSTRAINT "lgpd_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_lgpd_requests_user_id" ON "lgpd_requests"("user_id");
CREATE INDEX IF NOT EXISTS "idx_lgpd_requests_status" ON "lgpd_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_lgpd_requests_created_at" ON "lgpd_requests"("created_at");

-- AddForeignKey
ALTER TABLE "lgpd_requests" ADD CONSTRAINT "lgpd_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comentários
COMMENT ON TABLE "lgpd_requests" IS 'Solicitações LGPD/GDPR: cópia, correção ou exclusão de dados pessoais (Art. 18)';
COMMENT ON COLUMN "users"."privacy_settings" IS 'Configurações de privacidade: visibilidade, indexação, compartilhamento de analytics';
