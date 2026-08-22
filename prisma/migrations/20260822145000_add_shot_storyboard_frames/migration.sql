CREATE TABLE IF NOT EXISTS "shot_storyboard_frames" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" BIGINT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" BIGINT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "shot_id" BIGINT NOT NULL REFERENCES "shots"("id") ON DELETE CASCADE,
  "prompt" TEXT NOT NULL,
  "final_prompt" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT,
  "image_url" TEXT,
  "storage_path" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "error_message" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "approved_at" TIMESTAMPTZ,
  "approved_by_id" BIGINT REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_shot_storyboard_frames_user_id" ON "shot_storyboard_frames"("user_id");
CREATE INDEX IF NOT EXISTS "idx_shot_storyboard_frames_project_id" ON "shot_storyboard_frames"("project_id");
CREATE INDEX IF NOT EXISTS "idx_shot_storyboard_frames_shot_id" ON "shot_storyboard_frames"("shot_id");
