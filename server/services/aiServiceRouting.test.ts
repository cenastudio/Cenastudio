import { describe, expect, it } from "vitest";
import { TOOLS } from "../../shared/tools.js";
import {
  CREATIVE_TOOLS,
  HIGH_CRITICALITY_TOOLS,
  MEDIUM_CRITICALITY_TOOLS,
  TEMPERATURE_PROFILES,
  resolveToolCriticality,
  resolveToolMaxTokens,
  resolveToolModel,
  resolveToolProfileName,
  resolveToolSampling,
} from "./aiService.js";

/**
 * Fases B e C do spec `qualidade-raciocinio-ia`.
 *
 * O que estes testes protegem não é o valor de temperatura em si (esse muda com
 * o eval da Fase D), é a estrutura: toda ferramenta existente cai em exatamente
 * uma faixa de criticidade e recebe um perfil de amostragem. O modo de falhar
 * antigo era silencioso — uma ferramenta nova simplesmente não era roteada, e
 * ninguém percebia.
 */
describe("criticidade por ferramenta (Fase B)", () => {
  const ALL_IDS = TOOLS.map((t) => t.id);

  it("cobre as 12 ferramentas, sem sobreposição entre faixas", () => {
    const grouped = [...HIGH_CRITICALITY_TOOLS, ...MEDIUM_CRITICALITY_TOOLS, ...CREATIVE_TOOLS];

    expect(ALL_IDS).toHaveLength(12);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual([...ALL_IDS].sort());
  });

  it("classifica orçamento, contrato, callsheet e checklist como alta criticidade", () => {
    for (const id of ["04", "06", "03", "09"]) {
      expect(resolveToolCriticality(id)).toBe("high");
    }
  });

  it("classifica briefing, moodboard e assistente como criativas", () => {
    for (const id of ["07", "08", "12"]) {
      expect(resolveToolCriticality(id)).toBe("creative");
    }
  });

  it("trata ferramenta desconhecida como criticidade média, não como criativa", () => {
    // Fail-safe: ferramenta nova sem classificação não deve cair no grupo de
    // temperatura mais alta por acidente.
    expect(resolveToolCriticality("99")).toBe("medium");
  });

  it("roteia alta criticidade para modelo fixo e média para o padrão do provedor", () => {
    expect(resolveToolModel("04")).toBe("nvidia/nemotron-3-super-120b-a12b:free");
    expect(resolveToolModel("06")).toBe(resolveToolModel("04"));
    expect(resolveToolModel("05")).toBeUndefined();
    expect(resolveToolModel("08")).toBe("nvidia/nemotron-3-super-120b-a12b:free");
  });

  it("dá o mesmo modelo para todas as ferramentas da mesma faixa", () => {
    const models = HIGH_CRITICALITY_TOOLS.map(resolveToolModel);
    expect(new Set(models).size).toBe(1);
  });
});

describe("perfis de temperatura (Fase C)", () => {
  it("mantém os perfis dentro das faixas do design", () => {
    expect(TEMPERATURE_PROFILES.precision.temperature).toBeLessThanOrEqual(0.3);
    expect(TEMPERATURE_PROFILES.standard.temperature).toBeGreaterThanOrEqual(0.5);
    expect(TEMPERATURE_PROFILES.standard.temperature).toBeLessThanOrEqual(0.7);
    expect(TEMPERATURE_PROFILES.creative.temperature).toBeGreaterThanOrEqual(0.7);
    expect(TEMPERATURE_PROFILES.creative.temperature).toBeLessThanOrEqual(0.8);
  });

  it("usa precision no que precisa ser repetível", () => {
    for (const id of ["03", "04", "06", "09"]) {
      expect(resolveToolProfileName(id)).toBe("precision");
      expect(resolveToolSampling(id).temperature).toBe(0.2);
      expect(resolveToolSampling(id).top_p).toBe(0.95);
    }
  });

  it("usa creative no roteiro, mesmo ele sendo criticidade média", () => {
    // Perfil não é espelho da criticidade — é a única exceção do mapa e existe
    // de propósito (ver comentário de TOOL_TEMPERATURE_MAP).
    expect(resolveToolCriticality("01")).toBe("medium");
    expect(resolveToolProfileName("01")).toBe("creative");
  });

  it("cai em standard quando a ferramenta não está no mapa", () => {
    expect(resolveToolProfileName("02")).toBe("standard");
    expect(resolveToolProfileName("99")).toBe("standard");
    expect(resolveToolSampling("02").temperature).toBe(0.6);
    expect(resolveToolSampling("02").top_p).toBe(0.95);
  });

  it("dá um perfil válido para cada uma das 12 ferramentas", () => {
    for (const tool of TOOLS) {
      expect(Object.keys(TEMPERATURE_PROFILES)).toContain(resolveToolProfileName(tool.id));
    }
  });

  it("dá à ferramenta 04 teto de saída maior que o default", () => {
    // Regressão da A4.6: com o teto antigo de 4096, o orçamento de um briefing
    // médio era cortado com finish_reason "length" no meio do bloco
    // `cena.budget.v1`, que vive no fim da resposta (ADR-013) — e a ponte para o
    // módulo de Orçamento ficava inerte por truncamento nosso, não por falha do
    // modelo. Medido: mesmo caso e mesmo modelo passaram a emitir bloco válido
    // com 9 rubricas ao subir o teto.
    expect(resolveToolMaxTokens("04")).toBeGreaterThan(4096);
    expect(resolveToolMaxTokens("04")).toBeGreaterThan(resolveToolMaxTokens("01"));
    expect(resolveToolSampling("04").max_tokens).toBe(resolveToolMaxTokens("04"));
  });

  it("dá a toda ferramenta teto acima do 4096 que truncava documento longo", () => {
    for (const tool of TOOLS) {
      expect(resolveToolMaxTokens(tool.id)).toBeGreaterThan(4096);
    }
  });

  it("deixa de usar a temperatura global do .env nas ferramentas mapeadas", () => {
    // Regressão da Fase C: antes, toda ferramenta usava
    // OPENROUTER_TEMPERATURE (0.7 no .env) — inclusive contrato e orçamento.
    process.env.OPENROUTER_TEMPERATURE = "0.7";
    expect(resolveToolSampling("06").temperature).toBe(0.2);
    expect(resolveToolSampling("08").temperature).toBe(0.8);
  });
});
