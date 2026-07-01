import "dotenv/config";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:5002";
const email = process.env.SMOKE_EMAIL || "admin@cenastudio.com.br";
const password = process.env.SMOKE_PASSWORD || process.env.ADMIN_DEFAULT_PASSWORD || "admin123";
const runId = `smoke-${Date.now()}`;
const cookieJar = new Map();
const created = {};

function rememberCookies(response) {
  const raw = response.headers.getSetCookie?.() || [];
  for (const header of raw) {
    const [pair] = header.split(";");
    const [name, value] = pair.split("=");
    if (name && value) cookieJar.set(name.trim(), value.trim());
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function request(method, path, body, options = {}) {
  const headers = {
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(cookieJar.size ? { Cookie: cookieHeader() } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: options.redirect || "manual",
  });
  rememberCookies(response);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok && !options.allowFailure) {
    throw new Error(`${method} ${path} -> ${response.status}: ${JSON.stringify(payload)}`);
  }
  return { status: response.status, payload, headers: response.headers };
}

async function cleanup() {
  const steps = [
    created.file && ["DELETE", `/api/files/${created.file}`],
    created.member && ["DELETE", `/api/project-members/${created.member}`],
    created.review && ["DELETE", `/api/video-reviews/${created.review}`],
    created.finance && ["DELETE", `/api/analytics/finance/entries/${created.finance}`],
    created.interaction && ["DELETE", `/api/clients/interactions/${created.interaction}`],
    created.opportunity && ["DELETE", `/api/clients/opportunities/${created.opportunity}`],
    created.collaborator && ["DELETE", `/api/collaborators/${created.collaborator}`],
    created.project && ["DELETE", `/api/projects/${created.project}`],
    created.client && ["DELETE", `/api/clients/${created.client}`],
  ].filter(Boolean);

  for (const [method, path] of steps) {
    await request(method, path, null, { allowFailure: true });
  }
}

try {
  const health = await request("GET", "/health");
  const ready = await request("GET", "/ready");
  if (health.payload?.data?.status !== "ok") throw new Error("Health check did not return ok");
  if (ready.payload?.data?.ready !== true) throw new Error("Readiness check did not return ready");

  await request("POST", "/api/auth/login", { email, password });
  const me = await request("GET", "/api/auth/me");
  if (!me.payload?.data?.user?.id) throw new Error("Auth /me did not return a user");

  const client = await request("POST", "/api/clients", {
    name: `Cliente ${runId}`,
    company: "Cena Smoke",
    email: `${runId}@example.com`,
    segment: "production",
    status: "lead",
    total_spent: 1200,
  });
  created.client = client.payload.data.id;

  const project = await request("POST", "/api/projects", {
    name: `Projeto ${runId}`,
    description: "Smoke Prisma",
    clientId: created.client,
    metadataJson: JSON.stringify({ smoke: true, runId }),
  });
  created.project = project.payload.data.id;

  const opportunity = await request("POST", "/api/clients/opportunities", {
    clientId: created.client,
    title: `Oportunidade ${runId}`,
    stage: "proposal",
    estimatedValue: 25000,
    probability: 60,
  });
  created.opportunity = opportunity.payload.data.id;

  const interaction = await request("POST", "/api/clients/interactions", {
    clientId: created.client,
    opportunityId: created.opportunity,
    type: "note",
    subject: "Smoke",
    notes: "Teste automatizado de persistencia Prisma",
  });
  created.interaction = interaction.payload.data.id;

  const collaborator = await request("POST", "/api/collaborators", {
    name: `Colaborador ${runId}`,
    email: `${runId}+collab@example.com`,
    role: "editor",
    skills: "smoke",
    daily_rate: 900,
  });
  created.collaborator = collaborator.payload.data.id;

  const member = await request("POST", `/api/project-members/projects/${created.project}`, {
    collaboratorId: created.collaborator,
    role: "editor",
  });
  created.member = member.payload.data.id;

  const filePayload = Buffer.from(`Smoke file ${runId}`, "utf8").toString("base64");
  const file = await request("POST", "/api/files/upload", {
    projectId: created.project,
    fileName: `${runId}.txt`,
    fileType: "text/plain",
    fileSize: Buffer.byteLength(filePayload, "base64"),
    fileData: filePayload,
  });
  created.file = file.payload.data.id;

  const finance = await request("POST", "/api/analytics/finance/entries", {
    kind: "income",
    status: "pending",
    description: `Smoke ${runId}`,
    amount: 5000,
    clientId: created.client,
    opportunityId: created.opportunity,
    dueDate: new Date().toISOString(),
  });
  created.finance = finance.payload.data.id;

  const review = await request("POST", "/api/video-reviews", {
    projectId: created.project,
    title: `Review ${runId}`,
    videoUrl: "https://example.com/video.mp4",
    version: "v1",
  });
  created.review = review.payload.data.id;

  for (const path of [
    "/api/clients",
    `/api/clients/${created.client}`,
    "/api/projects",
    `/api/projects/${created.project}`,
    "/api/clients/opportunities",
    "/api/clients/interactions",
    "/api/collaborators/stats",
    `/api/files/projects/${created.project}`,
    `/api/video-reviews/projects/${created.project}`,
    "/api/analytics/overall",
    "/api/analytics/finance",
  ]) {
    await request("GET", path);
  }

  await cleanup();
  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    checks: [
      "health",
      "ready",
      "auth",
      "clients",
      "projects",
      "opportunities",
      "interactions",
      "collaborators",
      "project-members",
      "files",
      "video-reviews",
      "finance",
      "analytics",
    ],
  }, null, 2));
} catch (error) {
  await cleanup().catch(() => undefined);
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2));
  process.exitCode = 1;
}
