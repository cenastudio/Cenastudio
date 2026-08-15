import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

const sendPrivacyRequestReceivedEmail = vi.hoisted(() => vi.fn());
const sendPrivacyRequestResolvedEmail = vi.hoisted(() => vi.fn());

vi.mock("./emailService.js", () => ({ isEmailConfigured: true }));
vi.mock("./privacyEmailService.js", () => ({
  sendPrivacyRequestReceivedEmail,
  sendPrivacyRequestResolvedEmail,
}));

describe("lgpd transactional email flow", () => {
  let authService: typeof import("./authService.js");
  let lgpdService: typeof import("./lgpdService.js");

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.LGPD_DELETE_GRACE_DAYS = "0";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-lgpd-email-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.STRIPE_SECRET_KEY;

    const dbModule = await import("../models/db.js");
    await dbModule.initDatabase();
    authService = await import("./authService.js");
    lgpdService = await import("./lgpdService.js");
  });

  it("notifies a requester at receipt and after deletion, using the original email before anonymization", async () => {
    sendPrivacyRequestReceivedEmail.mockReset().mockResolvedValue({ id: "received_1" });
    sendPrivacyRequestResolvedEmail.mockReset().mockResolvedValue({ id: "resolved_1" });
    const email = `privacy-${Date.now()}@example.com`;
    const user = await authService.registerUser("Clara Souza", email, "password-123");

    const request = await lgpdService.createLgpdRequest(user.id, "delete", email, "Clara Souza", "en");
    expect(sendPrivacyRequestReceivedEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: email,
      locale: "en",
      type: "delete",
      requestId: request.requestId,
    }));

    await lgpdService.processLgpdRequest(request.requestId, "completed", "admin@cena.example");
    await vi.waitFor(() => expect(sendPrivacyRequestResolvedEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: email,
      locale: "pt",
      type: "delete",
      status: "completed",
      requestId: request.requestId,
    })));
  });
});
