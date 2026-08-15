import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestHandler } from "express";

const sendAccountCreatedEmail = vi.hoisted(() => vi.fn());
const sendPasswordResetEmail = vi.hoisted(() => vi.fn());
const sendPasswordChangedEmail = vi.hoisted(() => vi.fn());

vi.mock("../services/emailService.js", () => ({ isEmailConfigured: true }));
vi.mock("../services/authEmailService.js", () => ({
  sendAccountCreatedEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
}));

type MockResponse = {
  statusCode: number;
  body: unknown;
  cookies: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  cookie: (name: string, value: string) => MockResponse;
};

function response(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    cookies: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    cookie(name, value) { this.cookies[name] = value; return this; },
  };
}

async function invoke(handler: RequestHandler, req: Record<string, unknown>) {
  const res = response();
  let capturedError: unknown;
  await handler(req as any, res as any, (error?: unknown) => { capturedError = error; });
  if (capturedError) throw capturedError;
  return res;
}

describe("authController transactional email flow", () => {
  let authController: typeof import("./authController.js");
  let authService: typeof import("../services/authService.js");

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.CLIENT_ORIGIN = "https://cena.example";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-auth-email-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    const dbModule = await import("../models/db.js");
    await dbModule.initDatabase();
    authController = await import("./authController.js");
    authService = await import("../services/authService.js");
  });

  beforeEach(() => {
    sendAccountCreatedEmail.mockReset().mockResolvedValue({ id: "welcome_1" });
    sendPasswordResetEmail.mockReset().mockResolvedValue({ id: "reset_1" });
    sendPasswordChangedEmail.mockReset().mockResolvedValue({ id: "changed_1" });
  });

  it("sends a welcome email after account creation without blocking the account", async () => {
    const email = `welcome-${Date.now()}@example.com`;
    const result = await invoke(authController.register, {
      headers: {},
      body: { name: "Clara Souza", email, password: "password-123" },
    });

    expect(result.statusCode).toBe(201);
    expect(sendAccountCreatedEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: email,
      name: "Clara Souza",
      planId: "pro",
      appUrl: "https://cena.example",
    }));
  });

  it("sends the reset link and a password-changed security alert", async () => {
    const email = `reset-mail-${Date.now()}@example.com`;
    await authService.registerUser("Clara Souza", email, "password-123");

    await invoke(authController.forgotPassword, { body: { email } });
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: email,
      resetUrl: expect.stringMatching(/^https:\/\/cena\.example\/reset-password\?token=/),
    }));

    const token = await authService.createResetToken(email);
    await invoke(authController.resetPassword, { body: { token, password: "new-password-123" } });
    expect(sendPasswordChangedEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: email,
      appUrl: "https://cena.example",
    }));
  });
});
