-- ADR-015: source links are nullable so existing public proposals remain valid.
-- No historical link is inferred from HTML or current project state.
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "project_id" BIGINT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "source_budget_id" BIGINT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "source_generation_id" BIGINT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "commercial_snapshot" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_project_id_fkey') THEN
    ALTER TABLE "proposals"
      ADD CONSTRAINT "proposals_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_source_budget_id_fkey') THEN
    ALTER TABLE "proposals"
      ADD CONSTRAINT "proposals_source_budget_id_fkey"
      FOREIGN KEY ("source_budget_id") REFERENCES "budgets"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_source_generation_id_fkey') THEN
    ALTER TABLE "proposals"
      ADD CONSTRAINT "proposals_source_generation_id_fkey"
      FOREIGN KEY ("source_generation_id") REFERENCES "generations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_proposals_project_id" ON "proposals"("project_id");
CREATE INDEX IF NOT EXISTS "idx_proposals_source_budget_id" ON "proposals"("source_budget_id");
CREATE INDEX IF NOT EXISTS "idx_proposals_source_generation_id" ON "proposals"("source_generation_id");
