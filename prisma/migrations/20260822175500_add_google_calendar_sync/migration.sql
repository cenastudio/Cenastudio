ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "google_access_token" TEXT,
  ADD COLUMN IF NOT EXISTS "google_refresh_token" TEXT,
  ADD COLUMN IF NOT EXISTS "google_token_expiry" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "google_calendar_email" TEXT;

CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" BIGINT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "google_event_id" TEXT NOT NULL,
  "html_link" TEXT,
  "title" TEXT NOT NULL,
  "starts_at" TIMESTAMPTZ NOT NULL,
  "ends_at" TIMESTAMPTZ NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'project_schedule',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "calendar_events_user_google_event_unique"
  ON "calendar_events"("user_id", "google_event_id");

CREATE INDEX IF NOT EXISTS "idx_calendar_events_user_id" ON "calendar_events"("user_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_project_id" ON "calendar_events"("project_id");
