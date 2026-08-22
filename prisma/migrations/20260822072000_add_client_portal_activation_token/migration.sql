ALTER TABLE "client_portal_access"
  ADD COLUMN IF NOT EXISTS "activation_token_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "activation_token_expires_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "activation_accepted_at" TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS "client_portal_access_activation_token_hash_key"
  ON "client_portal_access"("activation_token_hash")
  WHERE "activation_token_hash" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_client_portal_access_activation_token_hash"
  ON "client_portal_access"("activation_token_hash");
