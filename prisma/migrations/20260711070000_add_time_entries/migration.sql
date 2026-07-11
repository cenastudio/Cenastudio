-- CreateTable
CREATE TABLE "time_entries" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "project_id" BIGINT,
    "description" TEXT NOT NULL DEFAULT '',
    "started_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,
    "duration_sec" INTEGER NOT NULL DEFAULT 0,
    "hourly_rate" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_time_entries_user_id" ON "time_entries"("user_id");

-- CreateIndex
CREATE INDEX "idx_time_entries_project_id" ON "time_entries"("project_id");

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
