import "dotenv/config";

const baseUrl = (process.argv[2] || "https://frame-ai-director-correto.vercel.app").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error("Production smoke test requires SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `production-smoke-${suffix}@example.com`;
const password = `Smoke-${suffix}-A9!`;
let authUserId;

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function expectOk(response, label) {
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

try {
  const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Production Smoke Test" },
      app_metadata: { role: "user", plan_id: "pro" },
    }),
  });
  const createdUser = await expectOk(createResponse, "Supabase admin user creation");
  authUserId = createdUser.id;

  const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const tokenBody = await expectOk(tokenResponse, "Supabase password sign-in");

  const appLoginResponse = await fetch(`${baseUrl}/api/auth/supabase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: tokenBody.access_token }),
  });
  const appLoginBody = await expectOk(appLoginResponse, "Application Supabase login");
  const setCookie = appLoginResponse.headers.get("set-cookie");
  const cookie = setCookie?.split(";")[0];
  if (!cookie) throw new Error("Application login did not return the session cookie.");

  const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: cookie },
  });
  const meBody = await expectOk(meResponse, "Authenticated /api/auth/me");
  if (meBody?.data?.user?.email !== email) {
    throw new Error("Authenticated user does not match the temporary Supabase user.");
  }

  const projectsResponse = await fetch(`${baseUrl}/api/projects`, {
    headers: { Cookie: cookie },
  });
  const projectsBody = await expectOk(projectsResponse, "Authenticated /api/projects");

  console.log(
    JSON.stringify(
      {
        status: "ok",
        baseUrl,
        user: appLoginBody?.data?.user?.email,
        projects: Array.isArray(projectsBody?.data) ? projectsBody.data.length : 0,
      },
      null,
      2,
    ),
  );
} finally {
  if (authUserId) {
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }).catch(() => null);
  }
}
