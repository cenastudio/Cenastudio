-- CreateTable
CREATE TABLE "meetings" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "client_id" BIGINT NOT NULL,
    "opportunity_id" BIGINT,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "share_token" TEXT NOT NULL,
    "email_sent_at" TIMESTAMPTZ,
    "email_error" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meetings_share_token_key" ON "meetings"("share_token");

-- CreateIndex
CREATE INDEX "idx_meetings_client_id" ON "meetings"("client_id");

-- CreateIndex
CREATE INDEX "idx_meetings_user_id" ON "meetings"("user_id");

-- CreateIndex
CREATE INDEX "idx_meetings_starts_at" ON "meetings"("starts_at");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
