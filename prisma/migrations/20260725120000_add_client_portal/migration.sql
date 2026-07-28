-- Portal do Cliente (spec: portal-do-cliente)
-- Aditiva: nova tabela client_portal_access, 1:1 com clients.
-- Nenhuma coluna/tabela existente é alterada de forma destrutiva.

-- CreateTable
CREATE TABLE "client_portal_access" (
    "id" BIGSERIAL NOT NULL,
    "client_id" BIGINT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_portal_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_portal_access_client_id_key" ON "client_portal_access"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_portal_access_email_key" ON "client_portal_access"("email");

-- CreateIndex
CREATE INDEX "idx_client_portal_access_client_id" ON "client_portal_access"("client_id");

-- CreateIndex
CREATE INDEX "idx_client_portal_access_email" ON "client_portal_access"("email");

-- AddForeignKey
ALTER TABLE "client_portal_access" ADD CONSTRAINT "client_portal_access_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
