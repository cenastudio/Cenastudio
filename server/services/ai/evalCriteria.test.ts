import { describe, expect, it } from "vitest";
import {
  evaluateCase,
  extractCurrencyValues,
  validateEvalFile,
  type EvalCase,
} from "./evalCriteria.js";

/**
 * O eval decide qual modelo serve a faixa de alta criticidade (ADR-014). Se o
 * avaliador julgar errado, a decisão de modelo vai atrás. Estes testes cobrem os
 * checks um a um com saída fabricada, para o placar do runner ser confiável antes
 * de qualquer chamada real ao provedor.
 */
function makeCase(criteria: EvalCase["acceptanceCriteria"]): EvalCase {
  return { id: "caso", input: { briefing: "x" }, acceptanceCriteria: criteria };
}

describe("extractCurrencyValues", () => {
  it("lê valor simples, com centavos e faixa", () => {
    expect(extractCurrencyValues("Equipe: R$ 3.300 – R$ 5.500")).toEqual([3300, 5500]);
    expect(extractCurrencyValues("Total: R$ 1.200,50")).toEqual([1200.5]);
  });

  it("ignora número sem R$ para não confundir duração e diária com dinheiro", () => {
    // "3 min" e "2 diárias" não são dinheiro; sem essa regra o currencyRange
    // julgaria o número errado.
    expect(extractCurrencyValues("Vídeo de 3 min, 2 diárias, total R$ 12.000")).toEqual([12000]);
  });

  it("devolve vazio quando não há valor monetário", () => {
    expect(extractCurrencyValues("Sem orçamento neste documento")).toEqual([]);
  });
});

describe("checks de critério", () => {
  it("includesAll aponta os termos ausentes", () => {
    const result = evaluateCase(
      "ORÇAMENTO\nEquipe e equipamento",
      makeCase([
        {
          id: "rubricas",
          description: "cita equipe, equipamento e pós",
          check: { type: "includesAll", values: ["equipe", "equipamento", "pós-produção"] },
        },
      ]),
    );

    expect(result.passed).toBe(0);
    expect(result.total).toBe(1);
    expect(result.results[0].detail).toContain("pós-produção");
  });

  it("includesAll é insensível a caixa", () => {
    const result = evaluateCase(
      "EQUIPE: R$ 3.300",
      makeCase([
        {
          id: "equipe",
          description: "cita equipe",
          check: { type: "includesAll", values: ["Equipe"] },
        },
      ]),
    );

    expect(result.passed).toBe(1);
  });

  it("excludesAll reprova quando o termo proibido aparece", () => {
    const result = evaluateCase(
      "Valores praticados em 2024 no mercado",
      makeCase([
        {
          id: "sem-ano-fixo",
          description: "não crava ano de tabela de preço",
          check: { type: "excludesAll", values: ["praticados em 2024"] },
        },
      ]),
    );

    expect(result.passed).toBe(0);
    expect(result.results[0].detail).toContain("praticados em 2024");
  });

  it("regex respeita minMatches", () => {
    const faixas = "A: R$ 100 – R$ 200\nB: R$ 300 – R$ 400";
    const criterion = {
      id: "faixa",
      description: "usa faixa em vez de número único",
      check: { type: "regex" as const, pattern: "R\\$\\s*[\\d.]+\\s*–\\s*R\\$", minMatches: 2 },
    };

    expect(evaluateCase(faixas, makeCase([criterion])).passed).toBe(1);
    expect(evaluateCase("A: R$ 100 – R$ 200", makeCase([criterion])).passed).toBe(0);
  });

  it("regexAbsent reprova quando o padrão aparece e aprova quando não aparece", () => {
    // Critério negativo escrito como `regex` passa quando devia reprovar. Este
    // tipo existe para isso, e o teste trava a inversão.
    const criterion = {
      id: "sem-telefone",
      description: "não inventa telefone",
      check: { type: "regexAbsent" as const, pattern: "\\(?\\d{2}\\)?\\s?9\\d{4}[- ]?\\d{4}" },
    };

    const inventado = evaluateCase("Contato: (31) 99876-5432", makeCase([criterion]));
    expect(inventado.passed).toBe(0);
    expect(inventado.results[0].detail).toContain("99876-5432");
    expect(evaluateCase("Contato: A definir", makeCase([criterion])).passed).toBe(1);
  });

  it("noMarkdown pega os tokens que as regras globais proíbem", () => {
    const criterion = {
      id: "sem-markdown",
      description: "sem markdown (regra global de formatação)",
      check: { type: "noMarkdown" as const },
    };

    expect(evaluateCase("ORÇAMENTO\n• Equipe: R$ 3.300", makeCase([criterion])).passed).toBe(1);
    expect(evaluateCase("**Cliente:** TechXYZ", makeCase([criterion])).passed).toBe(0);
    expect(evaluateCase("# Briefing", makeCase([criterion])).passed).toBe(0);
    expect(evaluateCase("- item de lista", makeCase([criterion])).passed).toBe(0);
    expect(evaluateCase("```json\n{}\n```", makeCase([criterion])).passed).toBe(0);
  });

  it("noMarkdown não confunde bullet • nem asterisco de multiplicação", () => {
    const criterion = {
      id: "sem-markdown",
      description: "sem markdown",
      check: { type: "noMarkdown" as const },
    };

    expect(evaluateCase("• Equipe\n• Equipamento", makeCase([criterion])).passed).toBe(1);
    expect(evaluateCase("Diárias: 2 * 1.500 = 3.000", makeCase([criterion])).passed).toBe(1);
  });

  it("currencyRange julga o maior valor da resposta", () => {
    const criterion = {
      id: "total",
      description: "total entre R$ 8k e R$ 15k",
      check: { type: "currencyRange" as const, min: 8000, max: 15000 },
    };

    expect(
      evaluateCase("Equipe R$ 3.300\nTOTAL: R$ 12.000", makeCase([criterion])).passed,
    ).toBe(1);
    expect(evaluateCase("TOTAL: R$ 45.000", makeCase([criterion])).passed).toBe(0);
    expect(evaluateCase("Sem valores", makeCase([criterion])).results[0].detail).toContain(
      "nenhum valor",
    );
  });

  it("budgetBlock aprova bloco válido e reprova ausente", () => {
    const criterion = {
      id: "bloco",
      description: "emite o bloco cena.budget.v1",
      check: { type: "budgetBlock" as const, minCategories: 1 },
    };
    const withBlock = [
      "ORÇAMENTO",
      "<<<CENA_BUDGET_JSON",
      JSON.stringify({
        schema: "cena.budget.v1",
        currency: "BRL",
        categories: [{ key: "equipe", label: "Equipe", min: 3300, max: 5500 }],
      }),
      "CENA_BUDGET_JSON>>>",
    ].join("\n");

    expect(evaluateCase(withBlock, makeCase([criterion])).passed).toBe(1);
    const absent = evaluateCase("ORÇAMENTO sem bloco", makeCase([criterion]));
    expect(absent.passed).toBe(0);
    expect(absent.results[0].detail).toContain("absent");
  });

  it("critério manual fica fora do numerador e do denominador", () => {
    const result = evaluateCase(
      "qualquer coisa",
      makeCase([
        {
          id: "auto",
          description: "tem título",
          check: { type: "includesAll", values: ["qualquer"] },
        },
        { id: "gosto", description: "o texto convence?", check: { type: "manual" } },
      ]),
    );

    expect(result.passed).toBe(1);
    expect(result.total).toBe(1);
    expect(result.manual).toBe(1);
    expect(result.results[1].passed).toBeNull();
  });
});

describe("validateEvalFile", () => {
  const valid = {
    tool: "04",
    slug: "orcamento",
    cases: [
      {
        id: "caso-1",
        input: { briefing: "clipe de 3 min" },
        acceptanceCriteria: [
          { id: "c1", description: "d", check: { type: "noMarkdown" } },
        ],
      },
    ],
  };

  it("aceita arquivo bem formado", () => {
    expect(validateEvalFile(valid, "04-orcamento.eval.json").tool).toBe("04");
  });

  it("exige toolId de 2 dígitos", () => {
    expect(() => validateEvalFile({ ...valid, tool: "4" }, "x")).toThrow(/2 dígitos/);
  });

  it("rejeita id de caso duplicado", () => {
    const dup = { ...valid, cases: [valid.cases[0], valid.cases[0]] };
    expect(() => validateEvalFile(dup, "x")).toThrow(/duplicado/);
  });

  it("rejeita input vazio", () => {
    const empty = { ...valid, cases: [{ ...valid.cases[0], input: {} }] };
    expect(() => validateEvalFile(empty, "x")).toThrow(/input/);
  });

  it("rejeita caso sem critério", () => {
    const noCriteria = { ...valid, cases: [{ ...valid.cases[0], acceptanceCriteria: [] }] };
    expect(() => validateEvalFile(noCriteria, "x")).toThrow(/acceptanceCriteria/);
  });

  it("pega regex inválida antes de começar a bateria", () => {
    // Sem isso, a regex quebrada só apareceria depois de várias chamadas ao
    // provedor já terem sido gastas.
    const badRegex = {
      ...valid,
      cases: [
        {
          ...valid.cases[0],
          acceptanceCriteria: [
            { id: "c1", description: "d", check: { type: "regex", pattern: "R\\$ ([0-9" } },
          ],
        },
      ],
    };
    expect(() => validateEvalFile(badRegex, "x")).toThrow(/pattern inválido/);
  });
});
