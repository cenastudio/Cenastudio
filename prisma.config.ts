import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DIRECT_URL ||
  "postgresql://postgres:postgres@localhost:5432/postgres";

console.log("[prisma.config] Using database URL:", databaseUrl ? "SET" : "NOT SET");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
