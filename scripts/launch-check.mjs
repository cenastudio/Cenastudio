import "dotenv/config";

const required = [
  "JWT_SECRET",
  "CLIENT_ORIGIN",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
];

const failures = [];
const warnings = [];

for (const key of required) {
  if (!process.env[key]) failures.push(`${key} is missing`);
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  failures.push("JWT_SECRET must have at least 32 characters");
}

if (process.env.NODE_ENV === "production" && process.env.CLIENT_ORIGIN?.includes("localhost")) {
  failures.push("CLIENT_ORIGIN cannot be localhost in production");
}

if (
  process.env.VERCEL === "1" &&
  process.env.ALLOW_EPHEMERAL_SQLITE !== "true" &&
  (!process.env.DATABASE_PATH ||
    process.env.DATABASE_PATH.startsWith("/tmp") ||
    process.env.DATABASE_PATH.startsWith("./") ||
    process.env.DATABASE_PATH.startsWith("../"))
) {
  failures.push("Vercel production requires persistent storage or ALLOW_EPHEMERAL_SQLITE=true for controlled beta");
}

if (process.env.ALLOW_EPHEMERAL_SQLITE === "true") {
  warnings.push("ALLOW_EPHEMERAL_SQLITE=true is beta-only; data may reset on ephemeral hosts");
}

async function request(path, key, init = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

async function checkSupabaseRls() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  const anonTools = await request("tools?select=id&limit=1", process.env.SUPABASE_ANON_KEY);
  if (!anonTools.response.ok) failures.push(`anon cannot read public.tools (${anonTools.response.status})`);

  const anonPlans = await request("plans?select=id&limit=1", process.env.SUPABASE_ANON_KEY);
  if (!anonPlans.response.ok) failures.push(`anon cannot read public.plans (${anonPlans.response.status})`);

  const serviceUsers = await request("users?select=id&limit=1", process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!serviceUsers.response.ok) failures.push(`service_role cannot read public.users (${serviceUsers.response.status})`);

  const probeEmail = `launch-check-${Date.now()}@example.com`;
  const anonInsert = await request("users", process.env.SUPABASE_ANON_KEY, {
    method: "POST",
    body: JSON.stringify({ email: probeEmail, password_hash: "probe", role: "user" }),
  });
  if (anonInsert.response.ok) {
    failures.push("anon can insert into public.users; RLS is not blocking private user writes");
    await request(`users?email=eq.${encodeURIComponent(probeEmail)}`, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      method: "DELETE",
    }).catch(() => null);
  }
}

try {
  await checkSupabaseRls();
} catch (error) {
  failures.push(`Supabase check failed: ${error instanceof Error ? error.message : String(error)}`);
}

if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (failures.length) {
  console.error("Launch check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Launch check passed: env shape and Supabase RLS are ready.");
