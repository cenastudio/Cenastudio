-- CreateTable
CREATE TABLE "proposals" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "client_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "share_token" TEXT NOT NULL,
    "document_hash" TEXT NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "accepted_by_name" TEXT,
    "accepted_ip" TEXT,
    "accepted_user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proposals_share_token_key" ON "proposals"("share_token");

-- CreateIndex
CREATE INDEX "idx_proposals_client_id" ON "proposals"("client_id");

-- CreateIndex
CREATE INDEX "idx_proposals_user_id" ON "proposals"("user_id");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
