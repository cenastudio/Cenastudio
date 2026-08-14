ALTER TABLE "files"
ADD COLUMN IF NOT EXISTS "visible_in_client_portal" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_files_visible_in_client_portal"
ON "files"("visible_in_client_portal");
