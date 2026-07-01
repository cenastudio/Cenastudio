function isPlaceholder(value: string | undefined) {
  if (!value) return true;
  return ["changeme", "change-me", "secret", "your_", "localhost"].some((needle) =>
    value.toLowerCase().includes(needle),
  );
}

export function assertLaunchReadyEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  const issues: string[] = [];
  const clientOrigin = process.env.CLIENT_ORIGIN;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret || jwtSecret.length < 32 || isPlaceholder(jwtSecret)) {
    issues.push("JWT_SECRET must be set to a non-placeholder secret with at least 32 characters.");
  }

  if (!clientOrigin || clientOrigin.includes("localhost")) {
    issues.push("CLIENT_ORIGIN must point to the production frontend origin.");
  }

  if (!process.env.SUPABASE_URL) {
    issues.push("SUPABASE_URL is required in production.");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    issues.push("SUPABASE_SERVICE_ROLE_KEY is required for admin-managed accounts.");
  }

  const persistentDatabaseUrl =
    process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

  if (!persistentDatabaseUrl && process.env.ALLOW_EPHEMERAL_SQLITE !== "true") {
    issues.push(
      "DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL is required for persistent Supabase Postgres production storage.",
    );
  }

  const databasePath = process.env.DATABASE_PATH;
  const usingUnsafeVercelSqlite =
    !persistentDatabaseUrl &&
    process.env.VERCEL === "1" &&
    (!databasePath || databasePath.startsWith("/tmp") || databasePath.startsWith("./") || databasePath.startsWith("../"));
  if (usingUnsafeVercelSqlite && process.env.ALLOW_EPHEMERAL_SQLITE !== "true") {
    issues.push(
      "Vercel production cannot use the default /tmp SQLite database for launch. Configure a persistent database path on a persistent host or set ALLOW_EPHEMERAL_SQLITE=true only for controlled beta/testing.",
    );
  }

  if (issues.length > 0) {
    throw new Error(`Launch readiness check failed:\n- ${issues.join("\n- ")}`);
  }
}
