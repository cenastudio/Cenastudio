import { AppError } from '../../middleware/errorHandler.js';

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

/**
 * Função helper para gerar conteúdo com IA (OpenRouter)
 * Usada por todos os serviços de IA específicos
 */
export async function generateWithAI(system: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new AppError('OpenRouter API Key não configurada', 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.OPENROUTER_TIMEOUT_MS || 90000)
  );

  const model = process.env.OPENROUTER_MODEL || 'openrouter/auto';

  const body = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ],
    temperature: Number(process.env.OPENROUTER_TEMPERATURE || 0.7),
    top_p: Number(process.env.OPENROUTER_TOP_P || 0.95),
    max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS || 4096),
    stream: false,
  };

  let response: Response;

  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.CLIENT_ORIGIN || 'http://localhost:5173',
        'X-OpenRouter-Title': 'Cena Studio',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(
        'A IA demorou muito para responder. Tente novamente.',
        504
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => ({}))) as OpenRouterResponse;

  if (!response.ok) {
    throw new AppError(
      payload.error?.message || 'Erro na requisição para IA',
      response.status
    );
  }

  const output = payload.choices?.[0]?.message?.content?.trim();

  if (!output) {
    throw new AppError('IA retornou resposta vazia', 502);
  }

  return output;
}
