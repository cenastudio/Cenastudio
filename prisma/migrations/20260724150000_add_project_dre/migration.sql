-- DRE por Projeto (spec: dre-por-projeto)
-- Aditiva: nova coluna opcional em financial_entries + nova tabela dre_settings.
-- Nenhuma coluna/tabela existente é alterada de forma destrutiva.

-- AlterTable
ALTER TABLE "financial_entries" ADD COLUMN "project_id" BIGINT;

-- CreateIndex
CREATE INDEX "idx_financial_entries_project_id" ON "financial_entries"("project_id");

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "dre_settings" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "deductions" JSONB NOT NULL DEFAULT '[]',
    "allocated_expense_mode" TEXT,
    "allocated_expense_value" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dre_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dre_settings_project_id_key" ON "dre_settings"("project_id");

-- CreateIndex
CREATE INDEX "idx_dre_settings_user_id" ON "dre_settings"("user_id");

-- AddForeignKey
ALTER TABLE "dre_settings" ADD CONSTRAINT "dre_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dre_settings" ADD CONSTRAINT "dre_settings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
