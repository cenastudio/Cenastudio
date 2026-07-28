import { describe, expect, it } from "vitest";
import { buildProjectContext } from "./aiService.js";

// ADR-013: o bloco `cena.budget.v1` fica persistido em `generations.output`, e o
// contexto de projeto reinjeta gerações anteriores no system prompt. O bloco não
// pode chegar lá — é dado de máquina, não continuidade criativa.
describe("buildProjectContext", () => {
  const output = [
    "ORÇAMENTO",
    "• Equipe: R$ 3.300 – R$ 5.500",
    "",
    "<<<CENA_BUDGET_JSON",
    '{"schema":"cena.budget.v1","currency":"BRL","categories":[{"key":"equipe","label":"Equipe","min":3300,"max":5500}]}',
    "CENA_BUDGET_JSON>>>",
  ].join("\n");

  it("remove o bloco estruturado das gerações anteriores", () => {
    const context = buildProjectContext({
      name: "Institucional Acme",
      approvedDocs: [{ toolId: "04", output, createdAt: new Date() }],
    });

    expect(context).toContain("Equipe: R$ 3.300 – R$ 5.500");
    expect(context).not.toContain("CENA_BUDGET_JSON");
    expect(context).not.toContain("cena.budget.v1");
  });

  it("mantém o contexto de gerações sem bloco", () => {
    const context = buildProjectContext({
      name: "Institucional Acme",
      clientName: "Acme",
      approvedDocs: [{ toolId: "07", output: "BRIEFING\nPúblico: PMEs", createdAt: new Date() }],
    });

    expect(context).toContain("Projeto: Institucional Acme");
    expect(context).toContain("Cliente: Acme");
    expect(context).toContain("Público: PMEs");
  });
});
