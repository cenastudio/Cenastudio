-- AlterTable: Add missing fields to shots table
-- Features: Thumbnails, Production Notes, Shot Number

ALTER TABLE "shots" ADD COLUMN IF NOT EXISTS "shot_number" TEXT;
ALTER TABLE "shots" ADD COLUMN IF NOT EXISTS "thumbnail_url" TEXT;
ALTER TABLE "shots" ADD COLUMN IF NOT EXISTS "production_notes" TEXT;

-- CreateTable: Custom shot types per user/project
CREATE TABLE IF NOT EXISTS "shot_types" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shot_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_shot_types_user_id" ON "shot_types"("user_id");

-- AddForeignKey
ALTER TABLE "shot_types" ADD CONSTRAINT IF NOT EXISTS "shot_types_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default shot types for existing users (PT and EN)
INSERT INTO "shot_types" ("user_id", "name", "is_default")
SELECT DISTINCT u.id, type_name, true
FROM "users" u
CROSS JOIN (
    VALUES
        ('Wide'), ('Médio'), ('Close'), ('Detalhe'), ('Plongée'), ('Contra-plongée'),
        ('Medium'), ('Detail'), ('High angle'), ('Low angle')
) AS types(type_name)
WHERE NOT EXISTS (
    SELECT 1 FROM "shot_types" st
    WHERE st.user_id = u.id AND st.name = types.type_name
);
