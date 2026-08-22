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
}

export const STORYBOARD_IMAGE_UNCONFIGURED_MESSAGE = "Storyboard image generation is not configured.";

function getStoryboardProvider() {
  return process.env.STORYBOARD_IMAGE_PROVIDER?.trim().toLowerCase() || "";
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

  throw new AppError(`Provider de storyboard "${provider}" ainda não está implementado.`, 503);
}
