import { AppError } from "../middleware/errorHandler.js";

export interface GenerateImageInput {
  prompt: string;
  style: "storyboard-pencil";
  aspectRatio: "16:9" | "4:3" | "1:1";
}

export interface GenerateImageResult {
  imageBuffer?: Buffer;
  imageUrl?: string;
  provider: string;
  model?: string;
  mediaType?: string;
}

export const STORYBOARD_IMAGE_UNCONFIGURED_MESSAGE = "Storyboard image generation is not configured.";

function getStoryboardProvider() {
  return process.env.STORYBOARD_IMAGE_PROVIDER?.trim().toLowerCase() || "";
}

function getOpenRouterStoryboardModel() {
  return process.env.STORYBOARD_IMAGE_MODEL?.trim() || "google/gemini-3.1-flash-lite-image";
}

export function sanitizeImageGenerationError(error: unknown): string {
  if (error instanceof AppError && error.status === 503) return STORYBOARD_IMAGE_UNCONFIGURED_MESSAGE;
  if (error instanceof AppError) return error.message;
  return "Storyboard image generation failed.";
}

export async function generateStoryboardImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  const provider = getStoryboardProvider();
  if (!provider || provider === "disabled") {
    throw new AppError("Geração de storyboard indisponível: configure STORYBOARD_IMAGE_PROVIDER e as credenciais do provider.", 503);
  }

  if (provider === "mock") {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("Provider mock de storyboard não pode ser usado em produção.", 503);
    }
    const encodedPrompt = Buffer.from(input.prompt).toString("base64url").slice(0, 24);
    return {
      provider: "mock",
      model: "storyboard-mock",
      imageUrl: `https://mock.cenastudio.local/mock-storyboard/${input.aspectRatio}/${encodedPrompt}.png`,
    };
  }

  if (provider === "openrouter") {
    const apiKey = process.env.STORYBOARD_IMAGE_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new AppError("OPENROUTER_API_KEY not configured for storyboard image generation.", 503);
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number(process.env.STORYBOARD_IMAGE_TIMEOUT_MS || process.env.OPENROUTER_TIMEOUT_MS || 90000),
    );
    const model = getOpenRouterStoryboardModel();

    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
          "X-OpenRouter-Title": "Cena Studio Storyboard",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: input.prompt,
          aspect_ratio: input.aspectRatio,
          resolution: process.env.STORYBOARD_IMAGE_RESOLUTION || "1K",
          quality: process.env.STORYBOARD_IMAGE_QUALITY || "medium",
          output_format: process.env.STORYBOARD_IMAGE_FORMAT || "png",
          n: 1,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError("Geração de storyboard demorou mais que o esperado. Tente novamente.", 504);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const payload = (await response.json().catch(() => ({}))) as {
      data?: Array<{ b64_json?: string; media_type?: string }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new AppError(payload.error?.message || "OpenRouter image generation failed.", response.status);
    }

    const image = payload.data?.find((item) => item.b64_json);
    if (!image?.b64_json) {
      throw new AppError("OpenRouter image generation returned no image.", 502);
    }

    return {
      provider: "openrouter",
      model,
      imageBuffer: Buffer.from(image.b64_json, "base64"),
      mediaType: image.media_type || "image/png",
    };
  }

  throw new AppError(`Provider de storyboard "${provider}" ainda não está implementado.`, 503);
}
