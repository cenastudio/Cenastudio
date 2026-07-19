import Anthropic from "@anthropic-ai/sdk";
import { getToolById } from "../../shared/tools.js";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { SITE_CONFIG } from "@shared/site";

interface NvidiaChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

function shouldEnableNvidiaThinking(model: string): boolean {
  const explicit = process.env.NVIDIA_ENABLE_THINKING;
  if (explicit !== undefined) {
    return explicit === "1" || explicit.toLowerCase() === "true";
  }

  return model.includes("nemotron");
}

async function generateWithNvidia(system: string, userText: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new AppError("NVIDIA_API_KEY not configured", 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.NVIDIA_TIMEOUT_MS || 60000),
  );
  const model = process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";
  const reasoningBudget = Number(process.env.NVIDIA_REASONING_BUDGET || 0);
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userText },
    ],
    temperature: Number(process.env.NVIDIA_TEMPERATURE || 0.7),
    top_p: Number(process.env.NVIDIA_TOP_P || 0.95),
    max_tokens: Number(process.env.NVIDIA_MAX_TOKENS || 2048),
    stream: false,
  };

  if (shouldEnableNvidiaThinking(model)) {
    if (reasoningBudget > 0) {
      body.reasoning_budget = reasoningBudget;
    }
    body.chat_template_kwargs = { enable_thinking: true };
  }

  let response: Response;
  try {
    response = await fetch(
      process.env.NVIDIA_INVOKE_URL || "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(
        "A IA demorou mais que o esperado para responder. Tente novamente em alguns segundos.",
        504,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => ({}))) as NvidiaChatResponse;
  if (!response.ok) {
    throw new AppError(payload.error?.message || "NVIDIA AI request failed", response.status);
  }

  const output = payload.choices?.[0]?.message?.content?.trim();
  if (!output) {
    throw new AppError("NVIDIA AI returned an empty response", 502);
  }

  return output;
}

async function generateWithAnthropic(system: string, userText: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AppError("ANTHROPIC_API_KEY not configured", 503);
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userText }],
  });

  return message.content[0]?.type === "text"
    ? message.content[0].text
    : "Não foi possível gerar conteúdo.";
}

// Free OpenRouter models to try, in order, when the primary choice is
// unavailable (discontinued) or temporarily rate-limited upstream. OpenRouter's
// `:free` tier is a shared pool across all of its users, not a dedicated quota
// for this app, so any single free model can go down or get rate-limited
// without warning — this list is what makes the AI features resilient to that
// instead of failing the whole request on one provider's bad day.
const OPENROUTER_FREE_FALLBACK_CHAIN = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemma-4-31b-it:free",
];

// Errors worth retrying with a different model: rate limiting (429) and
// upstream provider failures (5xx). Anything else (bad request, auth, etc.)
// is a real error that switching models won't fix.
function isRetryableOpenRouterStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function callOpenRouterOnce(
  system: string,
  userText: string,
  model: string,
): Promise<{ ok: true; output: string } | { ok: false; status: number; message: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AppError("OPENROUTER_API_KEY not configured", 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.OPENROUTER_TIMEOUT_MS || 90000),
  );

  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userText },
    ],
    temperature: Number(process.env.OPENROUTER_TEMPERATURE || 0.7),
    top_p: Number(process.env.OPENROUTER_TOP_P || 0.95),
    max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS || 4096),
    stream: false,
  };

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
        "X-OpenRouter-Title": SITE_CONFIG.brandName,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(
        "A IA demorou mais que o esperado para responder. Tente novamente em alguns segundos.",
        504,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => ({}))) as OpenRouterChatResponse;
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: payload.error?.message || "OpenRouter AI request failed",
    };
  }

  const output = payload.choices?.[0]?.message?.content?.trim();
  if (!output) {
    return { ok: false, status: 502, message: "OpenRouter AI returned an empty response" };
  }

  return { ok: true, output };
}

async function generateWithOpenRouter(system: string, userText: string, modelOverride?: string): Promise<string> {
  const primaryModel = modelOverride || process.env.OPENROUTER_MODEL || OPENROUTER_FREE_FALLBACK_CHAIN[0];

  // Try the requested/default model first, then fall back through the free
  // chain (skipping the primary if it's already in the chain) on
  // rate-limit/provider-outage errors only.
  const modelsToTry = [primaryModel, ...OPENROUTER_FREE_FALLBACK_CHAIN.filter((m) => m !== primaryModel)];

  let lastError: { status: number; message: string } | null = null;
  for (const model of modelsToTry) {
    const result = await callOpenRouterOnce(system, userText, model);
    if (result.ok) {
      return result.output;
    }
    lastError = { status: result.status, message: result.message };
    if (!isRetryableOpenRouterStatus(result.status)) {
      // Not a "model unavailable" situation (e.g. bad request) — fail fast.
      throw new AppError(result.message, result.status);
    }
    // Otherwise, loop and try the next model in the chain.
  }

  throw new AppError(
    lastError?.message || "Todos os modelos de IA gratuitos estão indisponíveis no momento. Tente novamente em alguns minutos.",
    lastError?.status || 503,
  );
}

// Build a rich project context string to inject into the AI system prompt
function buildProjectContext(data: {
  name: string;
  description?: string | null;
  clientName?: string;
  goals?: Record<string, string>;
  approvedDocs?: Array<{ toolId: string; output: string; createdAt: string | Date }>;
}): string {
  const TOOL_NAMES: Record<string, string> = {
    "01": "Roteiro", "02": "Decupagem", "03": "Callsheet", "04": "Orçamento",
    "05": "Proposta", "06": "Contrato", "07": "Briefing", "08": "Moodboard",
    "09": "Checklist", "10": "Cronograma", "11": "Relatório de Entrega", "12": "Assistente",
  };

  const lines: string[] = ["\n\n─── CONTEXTO DO PROJETO ATIVO ───"];
  lines.push(`Projeto: ${data.name}`);
  if (data.clientName) lines.push(`Cliente: ${data.clientName}`);
  if (data.description) lines.push(`Objetivo: ${data.description}`);
  if (data.goals) {
    if (data.goals.format) lines.push(`Formato: ${data.goals.format}`);
    if (data.goals.tone) lines.push(`Tom/Gênero: ${data.goals.tone}`);
    if (data.goals.budget) lines.push(`Orçamento estimado: ${data.goals.budget}`);
    if (data.goals.cameraModel) lines.push(`Câmera: ${data.goals.cameraModel}`);
  }
  if (data.approvedDocs && data.approvedDocs.length > 0) {
    lines.push("\nDocumentos já gerados neste projeto (use como contexto de continuidade):");
    for (const doc of data.approvedDocs) {
      const name = TOOL_NAMES[doc.toolId] || `Ferramenta ${doc.toolId}`;
      const preview = String(doc.output || "").slice(0, 1200).replace(/\n/g, " ");
      lines.push(`\n[${name}]:\n${preview}${doc.output?.length > 1200 ? "..." : ""}`);
    }
  }
  lines.push("─────────────────────────────────\nUse estas informações para gerar um documento consistente com o trabalho já realizado neste job.");
  return lines.join("\n");
}

export async function generateForTool(
  userId: number,
  toolId: string,
  input: Record<string, string>,
  projectId?: number | string,
  modelOverride?: string,
  locale: "pt" | "en" = "pt",
): Promise<{ output: string; generationId: number }> {
  const provider = process.env.AI_PROVIDER || "openrouter";
  if (provider === "openrouter" && !process.env.OPENROUTER_API_KEY) {
    throw new AppError("AI service unavailable: OPENROUTER_API_KEY not configured", 503);
  }
  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    throw new AppError("AI service unavailable: ANTHROPIC_API_KEY not configured", 503);
  }
  if (provider === "nvidia" && !process.env.NVIDIA_API_KEY) {
    throw new AppError("AI service unavailable: NVIDIA_API_KEY not configured", 503);
  }

  const tool = getToolById(toolId);
  if (!tool) {
    throw new AppError("Tool not found", 404);
  }

  const isActive = shouldUsePrisma
    ? (await prisma.tool.findUnique({ where: { id: toolId }, select: { isActive: true } }))?.isActive
    : (db.prepare("SELECT is_active FROM tools WHERE id = ?").get(toolId) as { is_active: number } | undefined)?.is_active === 1;
  if (!isActive) {
    throw new AppError("Tool is not active", 403);
  }

  const userText =
    input.prompt ||
    input.text ||
    input.content ||
    Object.values(input).filter(Boolean).join("\n\n");

  if (!userText.trim()) {
    throw new AppError("Input is required", 400);
  }

  // Build project context to inject into AI prompt
  let projectContext = "";
  if (projectId) {
    try {
      const pid = Number(projectId);
      if (shouldUsePrisma) {
        const project = await prisma.project.findFirst({
          where: { id: BigInt(pid), userId: BigInt(userId) },
          select: { name: true, description: true, metadataJson: true, clientId: true },
        });
        if (project) {
          let clientName = "";
          if (project.clientId) {
            const client = await prisma.client.findUnique({
              where: { id: project.clientId },
              select: { name: true, company: true, industry: true },
            });
            if (client) clientName = client.company || client.name || "";
          }
          let goals: Record<string, string> = {};
          try {
            const metadata = JSON.parse(String(project.metadataJson || "{}"));
            goals = metadata.creativeGoals || {};
          } catch {}
          const approvedDocs = await prisma.generation.findMany({
            where: { userId: BigInt(userId), projectId: BigInt(pid) },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { toolId: true, output: true, createdAt: true },
          });
          projectContext = buildProjectContext({
            name: project.name,
            description: project.description,
            clientName,
            goals,
            approvedDocs: approvedDocs.map(doc => ({
              toolId: doc.toolId || '',
              output: doc.output || '',
              createdAt: doc.createdAt
            }))
          });
        }
      } else {
        const project = db.prepare(
          "SELECT name, description, metadata_json, client_id FROM projects WHERE id = ? AND user_id = ?"
        ).get(pid, userId) as { name: string; description: string; metadata_json: string; client_id: number | null } | undefined;
        if (project) {
          let clientName = "";
          if (project.client_id) {
            const client = db.prepare("SELECT name, company FROM clients WHERE id = ?").get(project.client_id) as { name: string; company: string } | undefined;
            if (client) clientName = client.company || client.name || "";
          }
          let goals: Record<string, string> = {};
          try { goals = JSON.parse(project.metadata_json || "{}").creativeGoals || {}; } catch {}
          const approvedDocs = db.prepare(
            "SELECT tool_id, output, created_at FROM generations WHERE user_id = ? AND project_id = ? ORDER BY created_at DESC LIMIT 10"
          ).all(userId, pid) as Array<{ tool_id: string; output: string; created_at: string }>;
          projectContext = buildProjectContext({
            name: project.name,
            description: project.description,
            clientName,
            goals,
            approvedDocs: approvedDocs.map(d => ({ toolId: d.tool_id, output: d.output, createdAt: d.created_at })),
          });
        }
      }
    } catch { /* silently skip context injection on error */ }
  }

  const outputStylePt = `\n\nREGRAS DE FORMATAÇÃO (OBRIGATÓRIO — NUNCA QUEBRE ESTAS REGRAS):\n1. PROIBIDO usar Markdown: nada de **, *, #, ##, ###, -, ---, \`\`\`, > ou qualquer sintaxe de programação.\n2. Para títulos: escreva em MAIÚSCULAS na própria linha, sem símbolos antes.\n3. Para listas: use • (bullet) ou números (1. 2. 3.), NUNCA use * ou -.\n4. Para ênfase: use MAIÚSCULAS na palavra, não ** nem *.\n5. A saída deve parecer um documento PDF profissional, não código.\n6. Parágrafos curtos, diretos, sem enrolação.\n\nExemplo CORRETO:\nBRIEFING DO PROJETO\n\nCliente: TechXYZ\nObjetivo: Vídeo institucional de 90 segundos.\n\n• Público-alvo: investidores B2B\n• Canal: YouTube e LinkedIn\n• Prazo: 30 dias\n\nExemplo ERRADO (NÃO FAÇA ISSO):\n# Briefing do Projeto\n**Cliente:** TechXYZ\n- Público-alvo: investidores`;

  const outputStyleEn = `\n\nFORMATTING RULES (MANDATORY — NEVER BREAK THESE RULES):\n1. Markdown is FORBIDDEN: no **, *, #, ##, ###, -, ---, \`\`\`, > or any code syntax.\n2. For headings: write in UPPERCASE on its own line, with no symbols before it.\n3. For lists: use • (bullet) or numbers (1. 2. 3.), NEVER use * or -.\n4. For emphasis: use UPPERCASE on the word, not ** or *.\n5. The output must look like a professional PDF document, not code.\n6. Short, direct paragraphs, no filler.\n\nCORRECT example:\nPROJECT BRIEF\n\nClient: TechXYZ\nGoal: 90-second corporate video.\n\n• Target audience: B2B investors\n• Channel: YouTube and LinkedIn\n• Deadline: 30 days\n\nWRONG example (DO NOT DO THIS):\n# Project Brief\n**Client:** TechXYZ\n- Target audience: investors`;

  // The document must be written in whichever language the user is
  // currently viewing the app in — not always Portuguese. `locale` comes
  // from the client's active language toggle (see client/src/lib/api.ts).
  const languageInstruction = locale === "en"
    ? `Tool: ${tool.name}. Respond in English (US), professional format for video production.`
    : `Ferramenta: ${tool.name}. Responda em português do Brasil, formato profissional para produção audiovisual.`;
  const outputStyle = locale === "en" ? outputStyleEn : outputStylePt;

  const system = `${tool.promptRole}${projectContext}\n\n${languageInstruction}${outputStyle}`;

  let output: string;
  const usedProvider = await checkProviderAvailable(provider);

  // Smart model routing: use specialized models per tool category if no user override
  const CALCULATION_TOOLS = ["04", "05", "06"]; // Orçamento, Proposta, Contrato
  const MARKETING_TOOLS = ["07", "08", "11"]; // Briefing, Moodboard, Entrega
  const effectiveModel = modelOverride || (
    CALCULATION_TOOLS.includes(toolId) ? "poolside/laguna-m.1:free"
    : MARKETING_TOOLS.includes(toolId) ? "nvidia/nemotron-3-super-120b-a12b:free"
    : undefined
  );

  if (usedProvider === "openrouter") {
    output = await generateWithOpenRouter(system, userText, effectiveModel);
  } else if (usedProvider === "anthropic") {
    output = await generateWithAnthropic(system, userText);
  } else {
    output = await generateWithNvidia(system, userText);
  }

  if (shouldUsePrisma) {
    const linkedProjectId = projectId ? BigInt(Number(projectId)) : null;
    if (linkedProjectId) {
      const project = await prisma.project.findFirst({ where: { id: linkedProjectId, userId: BigInt(userId) }, select: { id: true } });
      if (!project) throw new AppError("Project not found", 404);
    }
    const generation = await prisma.generation.create({ data: {
      userId: BigInt(userId), toolId, input: JSON.stringify(input), output, projectId: linkedProjectId,
    } });

    // Create notification
    const TOOL_NAMES_P: Record<string, string> = {
      "01": "Roteiro", "02": "Decupagem", "03": "Callsheet", "04": "Orçamento",
      "05": "Proposta", "06": "Contrato", "07": "Briefing", "08": "Moodboard",
      "09": "Checklist", "10": "Cronograma", "11": "Entrega", "12": "Assistente",
    };
    const toolNameP = TOOL_NAMES_P[toolId] || tool.name;
    await prisma.notification.create({ data: {
      userId: BigInt(userId), title: `${toolNameP} pronto`, message: `Documento "${toolNameP}" gerado com sucesso.`,
      type: "generation", link: linkedProjectId ? `/project/${linkedProjectId}/studio/${tool.slug}` : `/studio/${tool.slug}`,
    } });

    return { output, generationId: Number(generation.id) };
  }

  const result = db.prepare(
    "INSERT INTO generations (user_id, tool_id, input, output, project_id) VALUES (?, ?, ?, ?, ?)",
  ).run(userId, toolId, JSON.stringify(input), output, projectId ? Number(projectId) : null);

  // Create notification so user knows generation is ready (even if they left the page)
  const TOOL_NAMES: Record<string, string> = {
    "01": "Roteiro", "02": "Decupagem", "03": "Callsheet", "04": "Orçamento",
    "05": "Proposta", "06": "Contrato", "07": "Briefing", "08": "Moodboard",
    "09": "Checklist", "10": "Cronograma", "11": "Entrega", "12": "Assistente",
  };
  const toolName = TOOL_NAMES[toolId] || tool.name;
  db.prepare(
    "INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'generation', ?)"
  ).run(userId, `${toolName} pronto`, `Documento "${toolName}" gerado com sucesso. Clique para revisar.`, projectId ? `/project/${projectId}/studio/${tool.slug}` : `/studio/${tool.slug}`);

  return { output, generationId: Number(result.lastInsertRowid) };
}

async function checkProviderAvailable(provider: string): Promise<string> {
  if (provider !== "openrouter") return provider;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const requestCount = shouldUsePrisma
    ? (await prisma.usage.aggregate({ where: { period: currentMonth }, _sum: { count: true } }))._sum.count ?? 0
    : ((db.prepare("SELECT COALESCE(SUM(count), 0) AS count FROM usage WHERE period = ?").get(currentMonth) as { count: number }).count ?? 0);
  const freeLimit = Number(process.env.OPENROUTER_FREE_LIMIT || 50);

  if (requestCount >= freeLimit) {
    console.warn(`OpenRouter free limit (${freeLimit}) reached for ${currentMonth}, switching to fallback provider`);
    return process.env.FALLBACK_AI_PROVIDER || "anthropic";
  }

  return "openrouter";
}

export async function trackUsage(userId: number, toolId: string): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (shouldUsePrisma) {
    await prisma.$executeRaw`
      INSERT INTO usage (user_id, tool_id, period, count)
      VALUES (${BigInt(userId)}, ${toolId}, ${currentMonth}, 1)
      ON CONFLICT (user_id, tool_id, period)
      DO UPDATE SET count = usage.count + 1
    `;
  } else {
    db.prepare(`
      INSERT OR REPLACE INTO usage (user_id, tool_id, period, count)
      VALUES (?, ?, ?, COALESCE((SELECT count FROM usage WHERE user_id = ? AND tool_id = ? AND period = ?), 0) + 1)
    `).run(userId, toolId, currentMonth, userId, toolId, currentMonth);
  }
}
