-- CreateTable
CREATE TABLE "shot_lists" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "project_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Shot List',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shot_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shots" (
    "id" BIGSERIAL NOT NULL,
    "shot_list_id" BIGINT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "scene" TEXT NOT NULL DEFAULT '',
    "shot_type" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "camera" TEXT NOT NULL DEFAULT '',
    "lens" TEXT NOT NULL DEFAULT '',
    "movement" TEXT NOT NULL DEFAULT '',
    "duration_sec" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_shot_lists_user_id" ON "shot_lists"("user_id");

-- CreateIndex
CREATE INDEX "idx_shot_lists_project_id" ON "shot_lists"("project_id");

-- CreateIndex
CREATE INDEX "idx_shots_shot_list_id" ON "shots"("shot_list_id");

-- AddForeignKey
ALTER TABLE "shot_lists" ADD CONSTRAINT "shot_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shot_lists" ADD CONSTRAINT "shot_lists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shots" ADD CONSTRAINT "shots_shot_list_id_fkey" FOREIGN KEY ("shot_list_id") REFERENCES "shot_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
