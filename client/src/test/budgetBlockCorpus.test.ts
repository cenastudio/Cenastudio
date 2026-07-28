/**
 * A4.6 — corpus determinístico do fluxo da ponte de orçamento (ADR-013).
 *
 * `budgetBlock.test.ts` cobre unidade por unidade. Este arquivo faz outra coisa:
 * pega saídas de modelo em formatos que aparecem de verdade (bloco ideal, bloco
 * dentro de cerca de código, resposta truncada por limite de tokens, valores como
 * `"R$ 3.300"`, chave inventada, geração anterior à A4.2...) e roda cada uma pela
 * cadeia inteira que a ponte usa — `extractBudgetBlock` → `buildBaselinePayload`
 * → `stripBudgetBlock` — verificando as invariantes que valem para **todas** as
 * entradas, não só para a que o teste escolheu.
 *
 * Serve também de arnês do classificador usado na medição de taxa de bloco
 * inválido (`npm run measure:budget-block`, Parte 2 da A4.6): garante que cada
 * formato conhecido cai no balde certo (`absent` / `malformed` / `schema` /
 * `empty`). A taxa contada aqui é a do corpus fixo — **não** é medição do modelo
 * real, que exige chamada ao provedor.
 */

import { describe, expect, it } from "vitest";
import {
  budgetBlockTotal,
  buildBaselinePayload,
  extractBudgetBlock,
  mergeDuplicateCategories,
  stripBudgetBlock,
  type BudgetBlockInvalidReason,
  type BudgetBlockValid,
} from "@/lib/budgetBlock";

const PROSE = [
  "ORÇAMENTO AUDIOVISUAL",
  "Estimativa de referência — valide com 2 a 3 orçamentos reais antes de fechar.",
  "• Equipe: R$ 3.300 – R$ 5.500",
  "• Pós-produção: R$ 1.800 – R$ 3.600",
  "",
  "TOTAL GERAL: R$ 5.100 – R$ 9.100",
].join("\n");

function block(json: string, { prose = PROSE, tail = "" } = {}) {
  return `${prose}\n\n<<<CENA_BUDGET_JSON\n${json}\nCENA_BUDGET_JSON>>>${tail}`;
}

const IDEAL_JSON = JSON.stringify(
  {
    schema: "cena.budget.v1",
    currency: "BRL",
    categories: [
      { key: "preproducao", label: "Pré-produção", min: 1200, max: 2000 },
      { key: "equipe", label: "Equipe", min: 3300, max: 5500 },
      { key: "posproducao", label: "Pós-produção", min: 1800, max: 3600 },
    ],
    margin: { min: 1690, max: 3080 },
    assumptions: "1 diária de 10h em BH, equipe de 3, pós por entrega",
  },
  null,
  2,
);

interface CorpusEntry {
  name: string;
  output: string;
  /** `null` = bloco válido (a ponte abre o diálogo). */
  expected: BudgetBlockInvalidReason | null;
}

const CORPUS: CorpusEntry[] = [
  {
    name: "bloco ideal, como o exemplo do prompt da 04",
    output: block(IDEAL_JSON),
    expected: null,
  },
  {
    name: "modelo escreveu despedida depois do bloco",
    output: block(IDEAL_JSON, { tail: "\n\nQualquer ajuste, me avise." }),
    expected: null,
  },
  {
    name: "bloco envolvido em cerca de código (modelo ignorou a regra de formatação)",
    output: `${PROSE}\n\n\`\`\`json\n<<<CENA_BUDGET_JSON\n${IDEAL_JSON}\nCENA_BUDGET_JSON>>>\n\`\`\``,
    expected: null,
  },
  {
    name: "cerca de código DENTRO das sentinelas",
    output: block(`\`\`\`json\n${IDEAL_JSON}\n\`\`\``),
    expected: "malformed",
  },
  {
    name: "chave inventada pelo modelo vira outros",
    output: block(
      JSON.stringify({
        schema: "cena.budget.v1",
        categories: [
          { key: "drone", label: "Drone", min: 500, max: 900 },
          { key: "equipe", label: "Equipe", min: 3300, max: 5500 },
        ],
      }),
    ),
    expected: null,
  },
  {
    name: "campo total extra emitido pelo modelo",
    output: block(
      JSON.stringify({
        schema: "cena.budget.v1",
        total: 99999,
        categories: [{ key: "equipe", label: "Equipe", min: 3300, max: 5500 }],
      }),
    ),
    expected: null,
  },
  {
    name: "chave repetida (rubrica quebrada em duas linhas)",
    output: block(
      JSON.stringify({
        schema: "cena.budget.v1",
        categories: [
          { key: "equipe", label: "Equipe (diárias)", min: 3300, max: 5500 },
          { key: "equipe", label: "Equipe (horas extras)", min: 400, max: 800 },
        ],
      }),
    ),
    expected: null,
  },
  {
    name: "14 rubricas: mantém 12 e descarta o excedente",
    output: block(
      JSON.stringify({
        schema: "cena.budget.v1",
        categories: Array.from({ length: 14 }, (_, index) => ({
          key: "outros",
          label: `Rubrica ${index + 1}`,
          min: 100,
          max: 200,
        })),
      }),
    ),
    expected: null,
  },
  {
    name: "geração anterior à A4.2 (sem bloco nenhum)",
    output: PROSE,
    expected: "absent",
  },
  {
    name: "resposta truncada no limite de tokens (sentinela de fechamento não veio)",
    output: `${PROSE}\n\n<<<CENA_BUDGET_JSON\n{ "schema": "cena.budget.v1", "categories": [ { "key": "equipe"`,
    expected: "absent",
  },
  {
    name: "JSON com vírgula sobrando",
    output: block(
      '{"schema":"cena.budget.v1","categories":[{"key":"equipe","label":"Equipe","min":3300,"max":5500},]}',
    ),
    expected: "malformed",
  },
  {
    name: "bloco acima de 4 KB",
    output: block(
      JSON.stringify({
        schema: "cena.budget.v1",
        categories: [{ key: "equipe", label: "Equipe", min: 3300, max: 5500 }],
        assumptions: "x".repeat(4200),
      }),
    ),
    expected: "malformed",
  },
  {
    name: "schema de outra versão",
    output: block(
      JSON.stringify({
        schema: "cena.budget.v2",
        categories: [{ key: "equipe", label: "Equipe", min: 3300, max: 5500 }],
      }),
    ),
    expected: "schema",
  },
  {
    name: "valores como string formatada em reais",
    output: block(
      JSON.stringify({
        schema: "cena.budget.v1",
        categories: [
          { key: "equipe", label: "Equipe", min: "R$ 3.300", max: "R$ 5.500" },
          { key: "posproducao", label: "Pós-produção", min: "1.800", max: "3.600" },
        ],
      }),
    ),
    expected: "empty",
  },
  {
    name: "faixa invertida em todas as rubricas",
    output: block(
      JSON.stringify({
        schema: "cena.budget.v1",
        categories: [
          { key: "equipe", label: "Equipe", min: 5500, max: 3300 },
          { key: "arte", label: "Arte", min: -200, max: 400 },
        ],
      }),
    ),
    expected: "empty",
  },
];

describe("A4.6 corpus: classificação de cada formato de saída", () => {
  it.each(CORPUS.map((entry) => [entry.name, entry] as const))("%s", (_name, entry) => {
    const result = extractBudgetBlock(entry.output);

    if (entry.expected === null) {
      expect(result.ok).toBe(true);
    } else {
      expect(result.ok).toBe(false);
      expect(result).toMatchObject({ reason: entry.expected });
    }
  });
});

describe("A4.6 corpus: invariantes válidas para toda a coleção", () => {
  it("nenhuma saída do corpus deixa o bloco vazar no texto exibido", () => {
    for (const entry of CORPUS) {
      const displayed = stripBudgetBlock(entry.output);
      expect(displayed, entry.name).not.toContain("CENA_BUDGET_JSON");
      expect(displayed, entry.name).not.toContain("cena.budget.v");
      expect(displayed, entry.name).not.toContain('"categories"');
      // A prosa do orçamento continua lá: a remoção não pode comer o documento.
      expect(displayed, entry.name).toContain("ORÇAMENTO AUDIOVISUAL");
    }
  });

  it("todo bloco válido gera baseline em centavos, sem margem e com total = Σ das rubricas", () => {
    const valid = CORPUS.filter((entry) => entry.expected === null);
    expect(valid.length).toBeGreaterThan(0);

    for (const entry of valid) {
      const block = extractBudgetBlock(entry.output) as BudgetBlockValid;

      for (const bound of ["min", "max"] as const) {
        const payload = buildBaselinePayload(block, bound);
        const merged = mergeDuplicateCategories(block.categories);

        // Reais → centavos com Math.round(v * 100), rubrica por rubrica.
        expect(payload.categories, entry.name).toEqual(
          merged.map((category) => ({
            name: category.label,
            budgeted: Math.round(category[bound] * 100),
          })),
        );

        // Total é recalculado como Σ do valor escolhido — nunca o `total` do modelo.
        expect(payload.totalAmount, entry.name).toBe(
          payload.categories.reduce((sum, category) => sum + category.budgeted, 0),
        );
        expect(payload.totalAmount, entry.name).toBe(
          Math.round(budgetBlockTotal(merged, bound) * 100),
        );

        // Margem fica fora do baseline: o total nunca a inclui.
        if (block.margin) {
          expect(payload.totalAmount, entry.name).toBeLessThan(
            Math.round((budgetBlockTotal(merged, bound) + block.margin[bound]) * 100),
          );
        }

        // Piso nunca é maior que teto, e nada negativo chega ao banco.
        expect(payload.totalAmount, entry.name).toBeGreaterThan(0);
        payload.categories.forEach((category) =>
          expect(category.budgeted, `${entry.name} / ${category.name}`).toBeGreaterThanOrEqual(0),
        );

        // `Budget.categories` não aceita nome repetido: chave repetida foi somada.
        const names = payload.categories.map((category) => category.name);
        expect(new Set(names).size, entry.name).toBe(names.length);

        // Limite de 12 rubricas vale também depois da fusão.
        expect(payload.categories.length, entry.name).toBeLessThanOrEqual(12);
      }

      // Piso ≤ teto no total, para o diálogo nunca oferecer a escolha invertida.
      expect(
        buildBaselinePayload(block, "min").totalAmount,
        entry.name,
      ).toBeLessThanOrEqual(buildBaselinePayload(block, "max").totalAmount);
    }
  });

  it("bloco inválido nunca produz payload: a ponte fica inerte e o motivo é conhecido", () => {
    const invalid = CORPUS.filter((entry) => entry.expected !== null);

    for (const entry of invalid) {
      const result = extractBudgetBlock(entry.output);
      expect(result.ok, entry.name).toBe(false);
      // Motivo dentro do conjunto fechado que a UI sabe explicar.
      expect(["absent", "malformed", "schema", "empty"], entry.name).toContain(
        (result as { reason: string }).reason,
      );
    }
  });
});

describe("A4.6 corpus: contagem por balde (arnês da medição de taxa)", () => {
  it("distribui o corpus nos motivos esperados", () => {
    const histogram = CORPUS.reduce<Record<string, number>>((acc, entry) => {
      const result = extractBudgetBlock(entry.output);
      const bucket = result.ok ? "valido" : result.reason;
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {});

    // Se um formato mudar de balde, esta contagem quebra antes de a ponte
    // silenciosamente passar a aceitar (ou recusar) algo diferente em produção.
    expect(histogram).toEqual({
      valido: 7,
      absent: 2,
      malformed: 3,
      schema: 1,
      empty: 2,
    });

    const invalid = CORPUS.length - histogram.valido;
    // Taxa do corpus fixo (7 válidos em 15) — não é a taxa do modelo real, que
    // só sai com chamada ao provedor (`npm run measure:budget-block`).
    expect(invalid / CORPUS.length).toBeCloseTo(8 / 15, 5);
  });
});
