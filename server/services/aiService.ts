import Anthropic from "@anthropic-ai/sdk";
import { getToolById } from "../../shared/tools.js";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";

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

  const response = await fetch(
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
  ).finally(() => clearTimeout(timeout));

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

export async function generateForTool(
  userId: number,
  toolId: string,
  input: Record<string, string>,
  projectId?: number | string,
): Promise<{ output: string; generationId: number }> {
  const provider = process.env.AI_PROVIDER || (process.env.NVIDIA_API_KEY ? "nvidia" : "anthropic");
  if (provider === "nvidia" && !process.env.NVIDIA_API_KEY) {
    throw new AppError("AI service unavailable: NVIDIA_API_KEY not configured", 503);
  }
  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    throw new AppError("AI service unavailable: ANTHROPIC_API_KEY not configured", 503);
  }

  const tool = getToolById(toolId);
  if (!tool) {
    throw new AppError("Tool not found", 404);
  }

  const active = db.prepare("SELECT is_active FROM tools WHERE id = ?").get(toolId) as
    | { is_active: number }
    | undefined;
  if (!active || active.is_active === 0) {
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

  const system = `${tool.promptRole}\n\nFerramenta: ${tool.name}. Responda em português do Brasil, formato profissional para produção audiovisual.`;
  const output =
    provider === "nvidia"
      ? await generateWithNvidia(system, userText)
      : await generateWithAnthropic(system, userText);

  const result = db
    .prepare(
      "INSERT INTO generations (user_id, tool_id, input, output, project_id) VALUES (?, ?, ?, ?, ?)",
    )
    .run(userId, toolId, JSON.stringify(input), output, projectId ? Number(projectId) : null);

  return { output, generationId: Number(result.lastInsertRowid) };
}
