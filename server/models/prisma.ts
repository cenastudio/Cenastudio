import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const databaseUrl =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

export const shouldUsePrisma = Boolean(databaseUrl);

function getPostgresRuntimeConfig(url: string) {
  try {
    const parsed = new URL(url);
    const usesSupabase =
      parsed.hostname.endsWith(".supabase.com") || parsed.hostname.endsWith(".supabase.co");

    if (usesSupabase) {
      // `pg` lets sslmode from the URL override the explicit TLS object.
      parsed.searchParams.delete("sslmode");
      return {
        connectionString: parsed.toString(),
        ssl: { rejectUnauthorized: false } as const,
      };
    }
  } catch {
    // Prisma/pg will report a useful connection error for malformed URLs.
  }

  return { connectionString: url, ssl: undefined };
}

const runtimeConfig = getPostgresRuntimeConfig(
  databaseUrl || "postgresql://postgres:postgres@localhost:5432/postgres",
);

// `max: 1` meant the entire process shared a single Postgres connection.
// That's fine for one request at a time, but any second concurrent request
// that touches the database (e.g. two people opening the same public review
// link, or the link's own 5s polling overlapping with a comment/approval
// write) had to wait for that one connection to free up, and would time out
// after connectionTimeoutMillis if it didn't in time — surfacing as the app
// "falling over" under just two simultaneous users. Railway Postgres here
// allows up to 100 connections; 10 gives real concurrency headroom while
// staying well under that ceiling. Still overridable via env if needed.
const adapter = new PrismaPg({
  connectionString: runtimeConfig.connectionString,
  max: Number(process.env.DATABASE_POOL_MAX || 10),
  connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 30_000),
  idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 10_000),
  ssl: runtimeConfig.ssl,
});

function isTransientDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";

  return [
    "Connection terminated due to connection timeout",
    "Connection terminated unexpectedly",
    "timeout exceeded",
    "ECONNRESET",
    "ETIMEDOUT",
    "P1001",
    "P1002",
    "P1017",
  ].some((needle) => message.includes(needle) || code === needle);
}

async function retryTransient<T>(operation: () => Promise<T>) {
  const attempts = Number(process.env.DATABASE_TRANSIENT_RETRIES || 2) + 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDatabaseError(error) || attempt === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError;
}

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: process.env.LOG_LEVEL === "debug" ? ["query", "warn", "error"] : ["warn", "error"],
  }).$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          return retryTransient(() => query(args));
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
