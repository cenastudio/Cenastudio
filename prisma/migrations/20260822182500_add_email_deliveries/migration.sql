CREATE TABLE IF NOT EXISTS "email_deliveries" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT,
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "event_type" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "to_email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'resend',
  "provider_message_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "error_message" TEXT,
  "sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_deliveries_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_email_deliveries_user_id" ON "email_deliveries"("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_deliveries_event_type" ON "email_deliveries"("event_type");
CREATE INDEX IF NOT EXISTS "idx_email_deliveries_status" ON "email_deliveries"("status");
