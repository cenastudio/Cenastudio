import { describe, expect, it } from "vitest";
import { renderProposalDocument } from "../../shared/proposalDocument.js";

const base = {
  currency: "BRL",
  title: "Filme institucional",
  studio: { name: "Cena Studio", primaryColor: "#e85002" },
  recipient: { name: "Aurora" },
  lines: [{ name: "Captação", description: "Uma diária", quantity: 1, unitPrice: 125_000, total: 125_000 }],
  subtotal: 125_000,
  total: 125_000,
  issuedAt: new Date("2026-08-22T12:00:00.000Z"),
} as const;

describe("renderProposalDocument", () => {
  it("renders a branded Portuguese document from cent values", () => {
    const html = renderProposalDocument({ ...base, locale: "pt", validityDays: 15 });

    expect(html).toContain("Cena Studio");
    expect(html).toContain("Proposta comercial");
    expect(html).toContain("R$\u00a01.250,00");
    expect(html).toContain("15 dias");
  });

  it("switches the document labels and currency formatting for English", () => {
    const html = renderProposalDocument({ ...base, locale: "en", currency: "USD" });

    expect(html).toContain("Commercial proposal");
    expect(html).toContain("Project investment");
    expect(html).toContain("$1,250.00");
  });

  it("escapes every free-text field and rejects an unsafe brand color", () => {
    const html = renderProposalDocument({
      ...base,
      locale: "pt",
      title: '<script>alert("x")</script>',
      studio: { name: "Cena", primaryColor: "javascript:alert(1)" },
      lines: [{ name: '<img src=x onerror="alert(1)">', total: 1 }],
    });

    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("#e85002");
    expect(html).not.toContain("javascript:alert");
  });
});
