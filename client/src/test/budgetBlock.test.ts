import { describe, expect, it } from "vitest";
import {
  budgetBlockTotal,
  buildBaselinePayload,
  extractBudgetBlock,
  stripBudgetBlock,
  type BudgetBlockValid,
} from "@/lib/budgetBlock";

function withBlock(json: string, prose = "ORÇAMENTO\n• Equipe: R$ 3.300 – R$ 5.500\n") {
  return `${prose}\n<<<CENA_BUDGET_JSON\n${json}\nCENA_BUDGET_JSON>>>`;
}

const validJson = JSON.stringify({
  schema: "cena.budget.v1",
  currency: "BRL",
  categories: [
    { key: "equipe", label: "Equipe", min: 3300, max: 5500 },
    { key: "posproducao", label: "Pós-produção", min: 1800, max: 3600 },
  ],
  margin: { min: 1690, max: 3080 },
  assumptions: "1 diária de 10h em BH",
});

describe("extractBudgetBlock", () => {
  it("extrai categorias, moeda, margem e premissas de um bloco válido", () => {
    const result = extractBudgetBlock(withBlock(validJson));

    expect(result.ok).toBe(true);
    const block = result as BudgetBlockValid;
    expect(block.currency).toBe("BRL");
    expect(block.categories).toEqual([
      { key: "equipe", label: "Equipe", min: 3300, max: 5500 },
      { key: "posproducao", label: "Pós-produção", min: 1800, max: 3600 },
    ]);
    expect(block.margin).toEqual({ min: 1690, max: 3080 });
    expect(block.assumptions).toBe("1 diária de 10h em BH");
    expect(block.dropped).toEqual([]);
  });

  it("marca como ausente quando não há sentinela (gerações anteriores à A4.2)", () => {
    const result = extractBudgetBlock("ORÇAMENTO\nTOTAL GERAL: R$ 12.000");
    expect(result).toEqual({ ok: false, reason: "absent", dropped: [] });
  });

  it("não tenta ler prosa quando o JSON está quebrado", () => {
    const result = extractBudgetBlock(withBlock('{ "schema": "cena.budget.v1", '));
    expect(result).toEqual({ ok: false, reason: "malformed", dropped: [] });
  });

  it("rejeita schema diferente do contrato", () => {
    const result = extractBudgetBlock(
      withBlock(JSON.stringify({ schema: "cena.budget.v2", categories: [] })),
    );
    expect(result).toEqual({ ok: false, reason: "schema", dropped: [] });
  });

  it("remapeia chave desconhecida para outros sem descartar a rubrica", () => {
    const result = extractBudgetBlock(
      withBlock(
        JSON.stringify({
          schema: "cena.budget.v1",
          categories: [{ key: "drone", label: "Drone", min: 500, max: 900 }],
        }),
      ),
    ) as BudgetBlockValid;

    expect(result.ok).toBe(true);
    expect(result.categories[0]).toEqual({ key: "outros", label: "Drone", min: 500, max: 900 });
    expect(result.currency).toBe("BRL");
  });

  it("descarta rubricas inválidas, mantém as válidas e lista os descartes", () => {
    const result = extractBudgetBlock(
      withBlock(
        JSON.stringify({
          schema: "cena.budget.v1",
          categories: [
            { key: "equipe", label: "Equipe", min: 3300, max: 5500 },
            { key: "locacao", label: "Locação", min: 900, max: 400 },
            { key: "arte", label: "Arte", min: -100, max: 200 },
            { key: "transporte", min: 100, max: 200 },
          ],
        }),
      ),
    ) as BudgetBlockValid;

    expect(result.ok).toBe(true);
    expect(result.categories.map((c) => c.label)).toEqual(["Equipe", "transporte"]);
    expect(result.dropped).toEqual([
      { label: "Locação", reason: "valores inválidos (piso/teto)" },
      { label: "Arte", reason: "valores inválidos (piso/teto)" },
    ]);
  });

  it("trata zero categorias válidas como bloco inválido", () => {
    const result = extractBudgetBlock(
      withBlock(
        JSON.stringify({
          schema: "cena.budget.v1",
          categories: [{ key: "equipe", label: "Equipe", min: "3300", max: 5500 }],
        }),
      ),
    );

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: "empty" });
  });

  it("normaliza chave com caixa/espaço e remapeia o resto para outros", () => {
    const result = extractBudgetBlock(
      withBlock(
        JSON.stringify({
          schema: "cena.budget.v1",
          categories: [
            { key: "  EQUIPE ", label: "Equipe", min: 100, max: 200 },
            { key: 7, label: "Seguro", min: 100, max: 200 },
          ],
        }),
      ),
    ) as BudgetBlockValid;

    expect(result.categories.map((c) => c.key)).toEqual(["equipe", "outros"]);
  });

  it("descarta valores não finitos (JSON não tem Infinity, mas string vira NaN)", () => {
    const result = extractBudgetBlock(
      withBlock(
        '{"schema":"cena.budget.v1","categories":[{"key":"equipe","label":"Equipe","min":1e999,"max":1e999},{"key":"arte","label":"Arte","min":100,"max":200}]}',
      ),
    ) as BudgetBlockValid;

    expect(result.categories.map((c) => c.label)).toEqual(["Arte"]);
    expect(result.dropped).toEqual([{ label: "Equipe", reason: "valores inválidos (piso/teto)" }]);
  });

  it("mantém as 12 primeiras rubricas e reporta o excedente como descartado", () => {
    const categories = Array.from({ length: 15 }, (_, index) => ({
      key: "outros",
      label: `Rubrica ${index + 1}`,
      min: 10,
      max: 20,
    }));
    const result = extractBudgetBlock(
      withBlock(JSON.stringify({ schema: "cena.budget.v1", categories })),
    ) as BudgetBlockValid;

    expect(result.ok).toBe(true);
    expect(result.categories).toHaveLength(12);
    expect(result.categories.at(-1)?.label).toBe("Rubrica 12");
    expect(result.dropped).toEqual([
      { label: "Rubrica 13", reason: "acima do limite de 12 rubricas" },
      { label: "Rubrica 14", reason: "acima do limite de 12 rubricas" },
      { label: "Rubrica 15", reason: "acima do limite de 12 rubricas" },
    ]);
  });

  it("trata bloco acima de 4 KB como inválido sem tentar parsear", () => {
    const result = extractBudgetBlock(
      withBlock(
        JSON.stringify({
          schema: "cena.budget.v1",
          categories: [{ key: "equipe", label: "Equipe", min: 100, max: 200 }],
          assumptions: "x".repeat(4200),
        }),
      ),
    );

    expect(result).toEqual({ ok: false, reason: "malformed", dropped: [] });
  });

  it("aceita bloco logo abaixo do limite de 4 KB", () => {
    const result = extractBudgetBlock(
      withBlock(
        JSON.stringify({
          schema: "cena.budget.v1",
          categories: [{ key: "equipe", label: "Equipe", min: 100, max: 200 }],
          assumptions: "x".repeat(3900),
        }),
      ),
    );

    expect(result.ok).toBe(true);
  });

  it("ignora o total emitido pelo modelo", () => {
    const result = extractBudgetBlock(
      withBlock(
        JSON.stringify({
          schema: "cena.budget.v1",
          total: 999999,
          categories: [{ key: "equipe", label: "Equipe", min: 1000, max: 2000 }],
        }),
      ),
    ) as BudgetBlockValid;

    expect(budgetBlockTotal(result.categories, "max")).toBe(2000);
  });
});

describe("buildBaselinePayload", () => {
  it("converte reais em centavos, soma o total e deixa a margem fora", () => {
    const block = extractBudgetBlock(withBlock(validJson)) as BudgetBlockValid;

    expect(buildBaselinePayload(block, "max")).toEqual({
      totalAmount: 910_000,
      currency: "BRL",
      categories: [
        { name: "Equipe", budgeted: 550_000 },
        { name: "Pós-produção", budgeted: 360_000 },
      ],
    });

    expect(buildBaselinePayload(block, "min")).toMatchObject({ totalAmount: 510_000 });
  });

  it("soma rubricas com a mesma chave e mantém o label da primeira ocorrência", () => {
    const block = extractBudgetBlock(
      withBlock(
        JSON.stringify({
          schema: "cena.budget.v1",
          categories: [
            { key: "equipe", label: "Equipe base", min: 1000, max: 2000 },
            { key: "arte", label: "Arte", min: 300, max: 400 },
            { key: "equipe", label: "Equipe extra", min: 500, max: 700 },
          ],
        }),
      ),
    ) as BudgetBlockValid;

    // O diálogo continua mostrando as três linhas emitidas pelo modelo...
    expect(block.categories).toHaveLength(3);

    // ...mas o baseline recebe duas categorias, com a soma na chave repetida.
    expect(buildBaselinePayload(block, "max")).toEqual({
      totalAmount: 310_000,
      currency: "BRL",
      categories: [
        { name: "Equipe base", budgeted: 270_000 },
        { name: "Arte", budgeted: 40_000 },
      ],
    });
    expect(budgetBlockTotal(block.categories, "max")).toBe(3100);
  });

  it("arredonda centavos de valores fracionários", () => {
    const block = extractBudgetBlock(
      withBlock(
        JSON.stringify({
          schema: "cena.budget.v1",
          categories: [{ key: "equipe", label: "Equipe", min: 100.005, max: 1200.5 }],
        }),
      ),
    ) as BudgetBlockValid;

    expect(buildBaselinePayload(block, "max").categories[0].budgeted).toBe(120_050);
  });
});

describe("stripBudgetBlock", () => {
  it("remove o bloco do fim da resposta e deixa a prosa intacta", () => {
    const output = withBlock(validJson);

    expect(stripBudgetBlock(output)).toBe("ORÇAMENTO\n• Equipe: R$ 3.300 – R$ 5.500");
    expect(stripBudgetBlock(output)).not.toContain("cena.budget.v1");
    expect(stripBudgetBlock(output)).not.toContain("CENA_BUDGET_JSON");
  });

  it("devolve o texto sem alteração quando não há bloco", () => {
    const output = "ORÇAMENTO\n\nTOTAL GERAL: R$ 12.000";
    expect(stripBudgetBlock(output)).toBe(output);
  });

  it("descarta a cauda quando a sentinela de fechamento não veio (resposta truncada)", () => {
    const output = 'ORÇAMENTO\nTOTAL: R$ 12.000\n<<<CENA_BUDGET_JSON\n{ "schema": "cena.budget.v1",';

    const stripped = stripBudgetBlock(output);
    expect(stripped).toBe("ORÇAMENTO\nTOTAL: R$ 12.000");
    expect(stripped).not.toContain("schema");
  });

  it("apara o espaço em branco que sobra em volta do bloco", () => {
    const output = `TEXTO\n\n   \n<<<CENA_BUDGET_JSON\n${validJson}\nCENA_BUDGET_JSON>>>\n\n   \n`;
    expect(stripBudgetBlock(output)).toBe("TEXTO");
  });

  it("remove mais de um bloco e preserva o texto entre eles", () => {
    const output = `A\n<<<CENA_BUDGET_JSON\n{}\nCENA_BUDGET_JSON>>>\nB\n<<<CENA_BUDGET_JSON\n{}\nCENA_BUDGET_JSON>>>\nC`;
    expect(stripBudgetBlock(output)).toBe("A\n\nB\n\nC");
  });

  it("tolera entrada vazia ou nula", () => {
    expect(stripBudgetBlock("")).toBe("");
    expect(stripBudgetBlock(null)).toBe("");
    expect(stripBudgetBlock(undefined)).toBe("");
  });
});
