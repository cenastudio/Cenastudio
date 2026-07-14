-- Admin audit log (Phase 2 — admin security). Every mutation made through
-- /admin/* is recorded here: who, what, on which target, when, from where.
CREATE TABLE IF NOT EXISTS "admin_actions" (
    "id" BIGSERIAL PRIMARY KEY,
    "admin_id" BIGINT NOT NULL,
    "admin_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_id" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_admin_actions_admin_id" ON "admin_actions"("admin_id");
CREATE INDEX IF NOT EXISTS "idx_admin_actions_created_at" ON "admin_actions"("created_at");
CREATE INDEX IF NOT EXISTS "idx_admin_actions_action" ON "admin_actions"("action");
