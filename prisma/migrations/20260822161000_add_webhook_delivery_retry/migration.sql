ALTER TABLE "webhook_deliveries"
  ADD COLUMN IF NOT EXISTS "next_retry_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "final_failed_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_next_retry_at"
  ON "webhook_deliveries"("next_retry_at")
  WHERE "next_retry_at" IS NOT NULL AND "success" = false;
