import Anthropic from "@anthropic-ai/sdk";
import { getToolById } from "../../shared/tools.js";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { SITE_CONFIG } from "@shared/site";
import { stripBudgetBlock } from "@shared/budgetBlock";

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

async function generateWithNvidia(
  system: string,
  userText: string,
  sampling?: SamplingParams,
): Promise<string> {
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
    temperature: sampling?.temperature ?? Number(process.env.NVIDIA_TEMPERATURE || 0.7),
    top_p: sampling?.top_p ?? Number(process.env.NVIDIA_TOP_P || 0.95),
    // Mesma precedência do OpenRouter, e aqui o default de código era ainda mais
    // apertado (2048): cortava documento longo pela metade neste provedor também.
    max_tokens: sampling?.max_tokens ?? Number(process.env.NVIDIA_MAX_TOKENS || DEFAULT_MAX_TOKENS),
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

async function generateWithAnthropic(
  system: string,
  userText: string,
  sampling?: SamplingParams,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AppError("ANTHROPIC_API_KEY not configured", 503);
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    max_tokens: sampling?.max_tokens ?? DEFAULT_MAX_TOKENS,
    system,
    messages: [{ role: "user", content: userText }],
    // A API da Anthropic rejeita `temperature` e `top_p` juntos; aqui vale a
    // temperatura do perfil e o top_p fica no default do provedor.
    ...(sampling ? { temperature: sampling.temperature } : {}),
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
// Conferida contra `GET https://openrouter.ai/api/v1/models` em 2026-07-27:
// todos os 5 constam na lista `:free`. Nesta checagem, dois modelos que estavam
// aqui antes já não eram mais oferecidos — `meta-llama/llama-3.3-70b-instruct:free`
// e `qwen/qwen3-next-80b-a3b-instruct:free` — ou seja, a cadeia tinha 2 de 5
// degraus mortos, que só custavam uma volta a mais de latência antes de cair no
// próximo. Reconferir esta lista ao tocar em roteamento de modelo.
const OPENROUTER_FREE_FALLBACK_CHAIN = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-20b:free",
  "inclusionai/ling-3.0-flash:free",
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
  sampling?: SamplingParams,
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
    temperature: sampling?.temperature ?? Number(process.env.OPENROUTER_TEMPERATURE || 0.7),
    top_p: sampling?.top_p ?? Number(process.env.OPENROUTER_TOP_P || 0.95),
    // Teto da ferramenta vence `OPENROUTER_MAX_TOKENS`, mesma precedência da
    // temperatura (específico ganha do global). Não é preferência de estilo: o
    // `.env` e o `.env.example` deste projeto fixam 4096, que é justamente o
    // valor que trunca o bloco da 04 no meio (ver TOOL_MAX_TOKENS). Deixar o
    // global vencer mantinha a feature quebrada em qualquer ambiente que copiou
    // o `.env.example`. A env var segue valendo para chamadas que não vêm de uma
    // ferramenta.
    max_tokens: sampling?.max_tokens ?? Number(process.env.OPENROUTER_MAX_TOKENS || DEFAULT_MAX_TOKENS),
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

async function generateWithOpenRouter(
  system: string,
  userText: string,
  modelOverride?: string,
  sampling?: SamplingParams,
): Promise<string> {
  const primaryModel = modelOverride || process.env.OPENROUTER_MODEL || OPENROUTER_FREE_FALLBACK_CHAIN[0];

  // Try the requested/default model first, then fall back through the free
  // chain (skipping the primary if it's already in the chain) on
  // rate-limit/provider-outage errors only.
  const modelsToTry = [primaryModel, ...OPENROUTER_FREE_FALLBACK_CHAIN.filter((m) => m !== primaryModel)];

  let lastError: { status: number; message: string } | null = null;
  for (const model of modelsToTry) {
    const result = await callOpenRouterOnce(system, userText, model, sampling);
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

// Build a rich project context string to inject into the AI system prompt.
// Exportado para teste: é aqui que o bloco `cena.budget.v1` seria reinjetado
// como contexto se ninguém removesse (ADR-013).
export function buildProjectContext(data: {
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
      // ADR-013: o bloco `cena.budget.v1` fica gravado em `generations.output`,
      // mas é dado de máquina — nunca volta como contexto de prompt.
      const text = stripBudgetBlock(doc.output);
      const preview = text.slice(0, 1200).replace(/\n/g, " ");
      lines.push(`\n[${name}]:\n${preview}${text.length > 1200 ? "..." : ""}`);
    }
  }
  lines.push("─────────────────────────────────\nUse estas informações para gerar um documento consistente com o trabalho já realizado neste job.");
  return lines.join("\n");
}

const OUTPUT_STYLE_PT = `\n\nREGRAS DE FORMATAÇÃO (OBRIGATÓRIO — NUNCA QUEBRE ESTAS REGRAS):\n1. PROIBIDO usar Markdown: nada de **, *, #, ##, ###, -, ---, \`\`\`, > ou qualquer sintaxe de programação.\n2. Para títulos: escreva em MAIÚSCULAS na própria linha, sem símbolos antes.\n3. Para listas: use • (bullet) ou números (1. 2. 3.), NUNCA use * ou -.\n4. Para ênfase: use MAIÚSCULAS na palavra, não ** nem *.\n5. A saída deve parecer um documento PDF profissional, não código.\n6. Parágrafos curtos, diretos, sem enrolação.\n\nExemplo CORRETO:\nBRIEFING DO PROJETO\n\nCliente: TechXYZ\nObjetivo: Vídeo institucional de 90 segundos.\n\n• Público-alvo: investidores B2B\n• Canal: YouTube e LinkedIn\n• Prazo: 30 dias\n\nExemplo ERRADO (NÃO FAÇA ISSO):\n# Briefing do Projeto\n**Cliente:** TechXYZ\n- Público-alvo: investidores`;

const OUTPUT_STYLE_EN = `\n\nFORMATTING RULES (MANDATORY — NEVER BREAK THESE RULES):\n1. Markdown is FORBIDDEN: no **, *, #, ##, ###, -, ---, \`\`\`, > or any code syntax.\n2. For headings: write in UPPERCASE on its own line, with no symbols before it.\n3. For lists: use • (bullet) or numbers (1. 2. 3.), NEVER use * or -.\n4. For emphasis: use UPPERCASE on the word, not ** or *.\n5. The output must look like a professional PDF document, not code.\n6. Short, direct paragraphs, no filler.\n\nCORRECT example:\nPROJECT BRIEF\n\nClient: TechXYZ\nGoal: 90-second corporate video.\n\n• Target audience: B2B investors\n• Channel: YouTube and LinkedIn\n• Deadline: 30 days\n\nWRONG example (DO NOT DO THIS):\n# Project Brief\n**Client:** TechXYZ\n- Target audience: investors`;

/**
 * Monta o system prompt de uma ferramenta: papel + contexto de projeto +
 * idioma + regras de formatação.
 *
 * Exportado porque a medição de taxa de bloco inválido da A4.6
 * (`scripts/measure-budget-block.ts`) precisa mandar ao modelo *exatamente* o
 * mesmo prompt que a geração real manda — inclusive as regras de formatação, que
 * são o motivo de o bloco `cena.budget.v1` usar sentinela em texto puro em vez
 * de cerca de código (ADR-013). Prompt duplicado no script viraria medição de
 * outra coisa na primeira vez que um dos dois mudasse.
 */
export function buildToolSystemPrompt(
  tool: { name: string; promptRole: string },
  options: { projectContext?: string; locale?: "pt" | "en" } = {},
): string {
  const { projectContext = "", locale = "pt" } = options;
  // The document must be written in whichever language the user is
  // currently viewing the app in — not always Portuguese. `locale` comes
  // from the client's active language toggle (see client/src/lib/api.ts).
  const languageInstruction =
    locale === "en"
      ? `Tool: ${tool.name}. Respond in English (US), professional format for video production.`
      : `Ferramenta: ${tool.name}. Responda em português do Brasil, formato profissional para produção audiovisual.`;
  const outputStyle = locale === "en" ? OUTPUT_STYLE_EN : OUTPUT_STYLE_PT;

  return `${tool.promptRole}${projectContext}\n\n${languageInstruction}${outputStyle}`;
}

/**
 * Criticidade de erro por ferramenta (ADR-014).
 *
 * O critério não é o tema da ferramenta, é o custo de estar errado: um orçamento
 * errado vira prejuízo, um moodboard morno vira uma conversa. O agrupamento
 * anterior (`CALCULATION_TOOLS` / `MARKETING_TOOLS`) misturava as duas coisas —
 * Proposta ficava junto de Orçamento por ambos "terem número", e Callsheet, que
 * erra em cima de gente esperando no set, não tinha roteamento nenhum.
 *
 * As chaves são o `toolId` (o que `generateForTool` recebe), não o slug usado no
 * design.md — os slugs ficam no comentário de cada linha.
 */
export type CriticalityTier = "high" | "medium" | "creative";

/** Erro custa dinheiro, prazo ou credibilidade jurídica. */
export const HIGH_CRITICALITY_TOOLS = [
  "04", // orcamento
  "06", // contrato
  "03", // callsheet
  "09", // checklist
];

/** Erro custa retrabalho, não prejuízo direto. */
export const MEDIUM_CRITICALITY_TOOLS = [
  "01", // roteiro
  "02", // decupagem
  "05", // proposta
  "10", // cronograma
  "11", // entrega
];

/** Erro é questão de gosto: o usuário refaz ou ignora. */
export const CREATIVE_TOOLS = [
  "07", // briefing
  "08", // moodboard
  "12", // assistente
];

export function resolveToolCriticality(toolId: string): CriticalityTier {
  if (HIGH_CRITICALITY_TOOLS.includes(toolId)) return "high";
  if (CREATIVE_TOOLS.includes(toolId)) return "creative";
  return "medium";
}

/**
 * Modelo por faixa de criticidade. `undefined` = usa o padrão do provedor
 * (`OPENROUTER_MODEL`) e, na falha, a cadeia de fallback.
 *
 * PROVISÓRIO: a escolha de `high` ainda **não** é respaldada por eval. Mantém o
 * modelo que já servia Orçamento/Contrato antes do reagrupamento, para não
 * trocar modelo em produção com base em palpite. A troca definitiva é a task
 * D4.1, depois do eval comparativo da Fase D.
 */
const TIER_MODEL: Record<CriticalityTier, string | undefined> = {
  high: "poolside/laguna-m.1:free",
  medium: undefined,
  creative: "nvidia/nemotron-3-super-120b-a12b:free",
};

/**
 * Roteamento de modelo por criticidade da ferramenta (sem override do usuário).
 * `undefined` = usa o modelo padrão do provedor.
 *
 * Exportado pelo mesmo motivo de `buildToolSystemPrompt`: a medição da A4.6 tem
 * de rodar contra o modelo que atende a ferramenta 04 em produção, não contra o
 * padrão do `.env`.
 */
export function resolveToolModel(toolId: string): string | undefined {
  return TIER_MODEL[resolveToolCriticality(toolId)];
}

/**
 * Perfis de amostragem por tipo de tarefa (Fase C do spec
 * `qualidade-raciocinio-ia`).
 *
 * Antes, toda ferramenta usava a mesma temperatura global (0.7), o que é alto
 * para um contrato e baixo para um moodboard. Cálculo e documento operacional
 * querem repetibilidade; texto criativo quer variação.
 */
export const TEMPERATURE_PROFILES = {
  precision: { temperature: 0.2, top_p: 0.95 },
  standard: { temperature: 0.6, top_p: 0.95 },
  creative: { temperature: 0.8, top_p: 0.95 },
} as const;

export type TemperatureProfileName = keyof typeof TEMPERATURE_PROFILES;
export type SamplingParams = { temperature: number; top_p: number; max_tokens: number };

/**
 * Teto de saída por ferramenta.
 *
 * Não é ajuste fino de custo: é correção de bug encontrado pela medição da A4.6.
 * Com o default antigo de 4096, um orçamento de briefing médio (institucional de
 * 2 diárias) era cortado com `finish_reason: "length"` **no meio do bloco
 * `cena.budget.v1`**, que o ADR-013 posiciona no fim da resposta. Resultado: a
 * ponte Orçamento → módulo ficava inerte e parecia "modelo ruim", quando era o
 * teto de tokens. Mesmo caso, mesmo modelo, teto de 12000: bloco válido com 9
 * rubricas.
 *
 * `max_tokens` é limite, não meta — o modelo só gasta o que precisa, então um
 * teto folgado não custa nada além de permitir a resposta inteira. O default
 * sobe para 8192 porque callsheet, checklist e contrato também são documentos
 * longos e correm o mesmo risco de corte silencioso; a 04 fica com folga maior
 * por ser a única cuja resposta carrega dado de máquina obrigatório.
 */
const TOOL_MAX_TOKENS: Record<string, number> = { "04": 12000 };
const DEFAULT_MAX_TOKENS = 8192;

export function resolveToolMaxTokens(toolId: string): number {
  return TOOL_MAX_TOKENS[toolId] ?? DEFAULT_MAX_TOKENS;
}

/**
 * Perfil por ferramenta. Note que não é um espelho da criticidade: Roteiro (01)
 * é criticidade média mas perfil `creative`, porque errar num roteiro é baixo
 * risco e variação ali é desejável. O que não está no mapa cai em `standard`.
 */
export const TOOL_TEMPERATURE_MAP: Record<string, TemperatureProfileName> = {
  "03": "precision", // callsheet
  "04": "precision", // orcamento
  "06": "precision", // contrato
  "09": "precision", // checklist
  "01": "creative", // roteiro
  "07": "creative", // briefing
  "08": "creative", // moodboard
  "12": "creative", // assistente
};

export function resolveToolProfileName(toolId: string): TemperatureProfileName {
  return TOOL_TEMPERATURE_MAP[toolId] || "standard";
}

/**
 * Amostragem efetiva de uma ferramenta.
 *
 * Precedência: o perfil da ferramenta vence `OPENROUTER_TEMPERATURE` /
 * `NVIDIA_TEMPERATURE` do `.env`, porque o específico ganha do global — as
 * variáveis de ambiente seguem valendo para as chamadas que não vêm de uma
 * ferramenta (ver `server/services/ai/aiHelper.ts`, não tocado aqui).
 */
export function resolveToolSampling(toolId: string): SamplingParams {
  const profile = TEMPERATURE_PROFILES[resolveToolProfileName(toolId)];
  return {
    temperature: profile.temperature,
    top_p: profile.top_p,
    max_tokens: resolveToolMaxTokens(toolId),
  };
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

  const system = buildToolSystemPrompt(tool, { projectContext, locale });

  let output: string;
  const usedProvider = await checkProviderAvailable(provider);

  const effectiveModel = modelOverride || resolveToolModel(toolId);
  const sampling = resolveToolSampling(toolId);

  if (usedProvider === "openrouter") {
    output = await generateWithOpenRouter(system, userText, effectiveModel, sampling);
  } else if (usedProvider === "anthropic") {
    output = await generateWithAnthropic(system, userText, sampling);
  } else {
    output = await generateWithNvidia(system, userText, sampling);
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
