import { describe, expect, it } from "vitest";
import { proposalMoneyToCents, renderProposalDocument } from "../../shared/proposalDocument.js";

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
  it("converts proposal form money values to cents without changing magnitude", () => {
    expect(proposalMoneyToCents(5_800)).toBe(580_000);
    expect(renderProposalDocument({
      ...base,
      locale: "pt",
      lines: [{ name: "Campanha", quantity: 1, unitPrice: proposalMoneyToCents(5_800), total: proposalMoneyToCents(5_800) }],
      subtotal: proposalMoneyToCents(5_800),
      total: proposalMoneyToCents(5_800),
    })).toContain("R$\u00a05.800,00");
  });

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

  it("keeps service descriptions and notes in spacious document sections", () => {
    const html = renderProposalDocument({
      ...base,
      locale: "pt",
      lines: [{
        name: "Filme hero",
        description: "Descricao longa do servico.\n\nInclui filmagem, direcao e finalizacao.",
        quantity: 1,
        unitPrice: 580_000,
        total: 580_000,
      }],
      notes: "Nota comercial longa.\n\nSegunda condicao importante.",
      subtotal: 580_000,
      total: 580_000,
    });

    expect(html).toContain("line-description");
    expect(html).toContain("Notas e condicoes");
    expect(html).toContain("Nota comercial longa.");
    expect(html).not.toContain("<table>");
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
