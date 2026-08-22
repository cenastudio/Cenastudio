import { AppError } from "../middleware/errorHandler.js";

interface TurnstileVerifyResponse {
  success?: boolean;
  "error-codes"?: string[];
}

export function isTurnstileConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(token: string | undefined, remoteIp?: string) {
  if (!isTurnstileConfigured()) return;
  if (!token?.trim()) throw new AppError("Verificação anti-bot obrigatória", 400);

  const form = new URLSearchParams();
  form.set("secret", process.env.TURNSTILE_SECRET_KEY || "");
  form.set("response", token.trim());
  if (remoteIp) form.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const payload = (await response.json().catch(() => ({}))) as TurnstileVerifyResponse;
  if (!response.ok || !payload.success) {
    throw new AppError("Verificação anti-bot falhou. Atualize a página e tente novamente.", 400);
  }
}
