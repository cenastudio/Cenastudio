ALTER TABLE "proposals"
ADD COLUMN IF NOT EXISTS "visible_in_client_portal" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "meetings"
ADD COLUMN IF NOT EXISTS "visible_in_client_portal" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_proposals_visible_in_client_portal"
ON "proposals"("visible_in_client_portal");

CREATE INDEX IF NOT EXISTS "idx_meetings_visible_in_client_portal"
ON "meetings"("visible_in_client_portal");
