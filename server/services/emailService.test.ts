import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resendSend = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

describe("emailService", () => {
  beforeEach(() => {
    vi.resetModules();
    resendSend.mockReset();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Cena Studio <hello@example.com>";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it("submits transactional emails to Resend with the configured sender", async () => {
    resendSend.mockResolvedValue({ data: { id: "email_123" }, error: null });
    const { isEmailConfigured, sendEmail } = await import("./emailService.js");

    await expect(sendEmail({
      to: "client@example.com",
      subject: "Welcome",
      html: "<p>Welcome</p>",
      text: "Welcome",
    })).resolves.toEqual({ id: "email_123" });

    expect(isEmailConfigured).toBe(true);
    expect(resendSend).toHaveBeenCalledWith(expect.objectContaining({
      from: "Cena Studio <hello@example.com>",
      to: "client@example.com",
      subject: "Welcome",
    }));
  });
});
