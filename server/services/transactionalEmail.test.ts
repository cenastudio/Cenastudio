import { describe, expect, it } from "vitest";
import { renderTransactionalEmail } from "./transactionalEmail.js";

describe("renderTransactionalEmail", () => {
  it("renders a dark, readable PT transaction with a safe action and text fallback", () => {
    const email = renderTransactionalEmail({
      locale: "pt",
      eyebrow: "Segurança da conta",
      title: "Crie uma nova senha",
      greeting: "Olá, Clara.",
      paragraphs: ["Recebemos uma solicitação para redefinir sua senha."],
      details: [{ label: "Validade", value: "1 hora" }],
      action: { label: "Criar nova senha", url: "https://cena.example/reset-password?token=abc" },
      safetyNote: "Se não foi você, ignore esta mensagem.",
    });

    expect(email.html).toContain("background:#080808");
    expect(email.html).toContain("Criar nova senha");
    expect(email.html).toContain('href="https://cena.example/reset-password?token=abc"');
    expect(email.text).toContain("Criar nova senha: https://cena.example/reset-password?token=abc");
  });

  it("escapes dynamic text and removes unsafe action URLs", () => {
    const email = renderTransactionalEmail({
      locale: "en",
      eyebrow: "Account security",
      title: "<img src=x onerror=alert(1)>",
      paragraphs: ["<script>alert('x')</script>"],
      action: { label: "Open", url: "javascript:alert(1)" },
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(email.html).not.toContain("javascript:");
    expect(email.text).not.toContain("Open:");
  });
});
