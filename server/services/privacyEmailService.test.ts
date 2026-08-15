import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.hoisted(() => vi.fn());

vi.mock("./emailService.js", () => ({ sendEmail }));

describe("privacyEmailService", () => {
  beforeEach(() => sendEmail.mockReset().mockResolvedValue({ id: "email_123" }));

  it("sends the account deletion receipt with a protocol and no credentials", async () => {
    const { sendPrivacyRequestReceivedEmail } = await import("./privacyEmailService.js");
    await sendPrivacyRequestReceivedEmail({
      to: "clara@example.com",
      name: "Clara Souza",
      locale: "pt",
      type: "delete",
      requestId: "LGPD-123",
      estimatedDays: 7,
      appUrl: "https://cena.example/profile",
    });

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "clara@example.com",
      subject: "Recebemos sua solicitação de privacidade — Cena Studio",
      html: expect.stringContaining("LGPD-123"),
    }));
    expect(sendEmail.mock.calls[0][0].html).not.toMatch(/senha|password/i);
  });

  it("confirms final deletion without a login CTA", async () => {
    const { sendPrivacyRequestResolvedEmail } = await import("./privacyEmailService.js");
    await sendPrivacyRequestResolvedEmail({
      to: "clara@example.com",
      name: "Clara Souza",
      locale: "en",
      type: "delete",
      status: "completed",
      requestId: "LGPD-123",
      appUrl: "https://cena.example",
    });

    const email = sendEmail.mock.calls[0][0];
    expect(email.subject).toBe("Your Cena Studio account was deleted");
    expect(email.html).not.toContain("Open Cena Studio");
    expect(email.text).not.toContain("Open Cena Studio:");
  });
});
