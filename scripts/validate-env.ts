#!/usr/bin/env tsx
/**
 * Environment Variables Validation Script
 *
 * Validates that all required environment variables are set correctly.
 * Run with: npx tsx scripts/validate-env.ts
 */

import "dotenv/config";

interface ValidationResult {
  variable: string;
  required: boolean;
  present: boolean;
  valid: boolean;
  message: string;
}

const results: ValidationResult[] = [];
const isProduction = process.env.NODE_ENV === "production";

function isPlaceholder(value: string): boolean {
  return ["changeme", "change-me", "secret", "your_", "localhost"].some((needle) =>
    value.toLowerCase().includes(needle),
  );
}

/**
 * Check if a variable exists and optionally validate its value
 */
function checkVar(
  name: string,
  required: boolean,
  validator?: (value: string) => { valid: boolean; message: string }
): void {
  const value = process.env[name];
  const present = value !== undefined && value !== "";

  let valid = present;
  let message = present ? "✅ Set" : required ? "❌ Missing (required)" : "⚠️  Not set (optional)";

  if (present && validator) {
    const result = validator(value!);
    valid = result.valid;
    message = result.valid ? `✅ ${result.message}` : `❌ ${result.message}`;
  }

  results.push({ variable: name, required, present, valid, message });
}

/**
 * Validators
 */
const validators = {
  jwtSecret: (value: string) => {
    const valid = value.length >= 32 && !isPlaceholder(value);
    return {
      valid,
      message: valid ? "Valid non-placeholder secret (32+ characters)" : "Must be a non-placeholder secret with 32+ characters",
    };
  },

  password: (value: string) => {
    const valid = value.length >= 12 && !isPlaceholder(value);
    return {
      valid,
      message: valid ? "Valid non-placeholder password (12+ characters)" : "Must be a non-placeholder password with 12+ characters",
    };
  },

  url: (value: string) => {
    try {
      const parsed = new URL(value);
      const valid = !isProduction || (parsed.protocol === "https:" && parsed.hostname !== "localhost");
      return {
        valid,
        message: valid ? "Valid URL" : "Production URL must use HTTPS and cannot point to localhost",
      };
    } catch {
      return { valid: false, message: "Invalid URL format" };
    }
  },

  supabaseUrl: (value: string) => {
    if (!value.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
      return { valid: false, message: "Invalid Supabase URL format" };
    }
    return { valid: true, message: "Valid Supabase URL" };
  },

  port: (value: string) => {
    const port = Number.parseInt(value, 10);
    const valid = !Number.isNaN(port) && port > 0 && port < 65536;
    return { valid, message: valid ? `Valid port ${port}` : "Invalid port number" };
  },

  email: (value: string) => {
    const valid = value.includes("@") && value.includes(".");
    return { valid, message: valid ? "Valid email format" : "Invalid email format" };
  },

  aiProvider: (value: string) => {
    const valid = ["openrouter", "anthropic", "nvidia"].includes(value);
    return {
      valid,
      message: valid ? `Valid provider: ${value}` : `Invalid provider (must be: openrouter, anthropic, or nvidia)`,
    };
  },

  databasePath: (value: string) => {
    const valid = value.endsWith(".db");
    return { valid, message: valid ? "Valid SQLite path" : "Should end with .db" };
  },

  postgresUrl: (value: string) => {
    const valid = value.startsWith("postgresql://");
    return { valid, message: valid ? "Valid PostgreSQL URL" : "Should start with postgresql://" };
  },
};

console.log("🔍 Validating Environment Variables...\n");

// === Server ===
console.log("📡 Server Configuration");
checkVar("NODE_ENV", false);
checkVar("PORT", false, validators.port);
checkVar("CLIENT_ORIGIN", isProduction, validators.url);
console.log("");

// === Authentication ===
console.log("🔐 Authentication");
checkVar("JWT_SECRET", true, validators.jwtSecret);
checkVar("ADMIN_EMAILS", false, validators.email);
checkVar("ADMIN_DEFAULT_PASSWORD", isProduction, validators.password);
checkVar("DEMO_USER_PASSWORD", false, validators.password);
console.log("");

// === Supabase (optional) ===
console.log("☁️  Supabase (Optional)");
checkVar("SUPABASE_URL", false, validators.supabaseUrl);
checkVar("SUPABASE_ANON_KEY", false);
checkVar("SUPABASE_SERVICE_ROLE_KEY", false);
checkVar("SUPABASE_DATABASE_URL", false, validators.postgresUrl);
checkVar("VITE_SUPABASE_URL", false, validators.supabaseUrl);
checkVar("VITE_SUPABASE_ANON_KEY", false);
console.log("");

// === Database ===
console.log("🗄️  Database");
checkVar("DATABASE_PATH", false, validators.databasePath);
checkVar("DATABASE_URL", false, validators.postgresUrl);
checkVar("POSTGRES_PRISMA_URL", false, validators.postgresUrl);
checkVar("POSTGRES_URL", false, validators.postgresUrl);
checkVar("ALLOW_EPHEMERAL_SQLITE", false);
const hasPersistentDatabase = Boolean(
  process.env.SUPABASE_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL,
);
if (isProduction && !hasPersistentDatabase && process.env.ALLOW_EPHEMERAL_SQLITE !== "true") {
  results.push({
    variable: "PERSISTENT_DATABASE",
    required: true,
    present: false,
    valid: false,
    message: "❌ SUPABASE_DATABASE_URL, DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL is required in production",
  });
}
console.log("");

// === AI Provider ===
console.log("🤖 AI Provider");
checkVar("AI_PROVIDER", false, validators.aiProvider);

const aiProvider = process.env.AI_PROVIDER || "openrouter";
if (aiProvider === "openrouter") {
  checkVar("OPENROUTER_API_KEY", true);
} else if (aiProvider === "anthropic") {
  checkVar("ANTHROPIC_API_KEY", true);
} else if (aiProvider === "nvidia") {
  checkVar("NVIDIA_API_KEY", true);
}
console.log("");

// === Integrations (Optional) ===
console.log("🔌 Integrations (Optional)");
checkVar("GITHUB_CLIENT_ID", false);
checkVar("GITHUB_CLIENT_SECRET", false);
checkVar("STRIPE_SECRET_KEY", false);
checkVar("SMTP_HOST", false);
console.log("");

// === Summary ===
const requiredVars = results.filter((r) => r.required);
const missingRequired = requiredVars.filter((r) => !r.present);
const invalidVars = results.filter((r) => r.present && !r.valid);

console.log("📊 Summary");
console.log("─".repeat(60));

if (missingRequired.length === 0 && invalidVars.length === 0) {
  console.log("✅ All required environment variables are set and valid!");
  console.log(`   Total checked: ${results.length}`);
  console.log(`   Required: ${requiredVars.length}`);
  console.log(`   Optional: ${results.length - requiredVars.length}`);
  process.exit(0);
} else {
  console.log("❌ Validation failed!\n");

  if (missingRequired.length > 0) {
    console.log(`Missing required variables (${missingRequired.length}):`);
    for (const v of missingRequired) {
      console.log(`   - ${v.variable}`);
    }
    console.log("");
  }

  if (invalidVars.length > 0) {
    console.log(`Invalid variables (${invalidVars.length}):`);
    for (const v of invalidVars) {
      console.log(`   - ${v.variable}: ${v.message}`);
    }
    console.log("");
  }

  console.log("💡 Tip: Copy .env.example to .env and fill in your values");
  console.log("   cp .env.example .env");
  process.exit(1);
}
