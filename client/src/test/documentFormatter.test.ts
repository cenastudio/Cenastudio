import { describe, expect, it } from "vitest";
import { cleanGeneratedText } from "@/lib/documentFormatter";

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
