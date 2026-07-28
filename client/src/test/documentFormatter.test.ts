import { describe, expect, it } from "vitest";
import { cleanGeneratedText, formatGeneratedDocumentText } from "@/lib/documentFormatter";

const BUDGET_OUTPUT = [
  "ORÇAMENTO",
  "• Equipe: R$ 3.300 – R$ 5.500",
  "",
  "<<<CENA_BUDGET_JSON",
  '{"schema":"cena.budget.v1","currency":"BRL","categories":[{"key":"equipe","label":"Equipe","min":3300,"max":5500}]}',
  "CENA_BUDGET_JSON>>>",
].join("\n");

describe("cleanGeneratedText", () => {
  it("remove marcadores de Markdown sem apagar valores legítimos", () => {
    const raw = [
      "# Orçamento",
      "**Resumo executivo**",
      "- Filme principal",
      "- Investimento: R$ 12.500,00",
      "- Margem: 15%",
      "`Entrega final`",
      "---",
    ].join("\n");

    const cleaned = cleanGeneratedText(raw);

    expect(cleaned).toContain("Orçamento");
    expect(cleaned).toContain("Resumo executivo");
    expect(cleaned).toContain("• Filme principal");
    expect(cleaned).toContain("R$ 12.500,00");
    expect(cleaned).toContain("15%");
    expect(cleaned).not.toMatch(/(^|\s)(#{1,6}|\*\*|`{1,3})(?=\s|\w)/);
  });
});

// ADR-013: exibição, cópia e export passam todos por `cleanGeneratedText`.
describe("remoção do bloco cena.budget.v1", () => {
  it("não deixa o bloco estruturado vazar no texto exibido/copiado", () => {
    const cleaned = cleanGeneratedText(BUDGET_OUTPUT);

    expect(cleaned).toBe("ORÇAMENTO\n• Equipe: R$ 3.300 – R$ 5.500");
    expect(cleaned).not.toContain("CENA_BUDGET_JSON");
    expect(cleaned).not.toContain("cena.budget.v1");
    expect(cleaned).not.toContain('"min"');
  });

  it("não deixa o bloco vazar no documento formatado para export", () => {
    const document = formatGeneratedDocumentText(BUDGET_OUTPUT, "Orçamento");

    expect(document).toContain("• Equipe: R$ 3.300 – R$ 5.500");
    expect(document).not.toContain("CENA_BUDGET_JSON");
    expect(document).not.toContain("cena.budget.v1");
  });

  it("remove bloco truncado sem deixar fragmento de JSON", () => {
    const cleaned = cleanGeneratedText(
      'ORÇAMENTO\nTOTAL: R$ 12.000\n<<<CENA_BUDGET_JSON\n{"schema":"cena.budget.v1"',
    );

    expect(cleaned).toBe("ORÇAMENTO\nTOTAL: R$ 12.000");
  });
});
