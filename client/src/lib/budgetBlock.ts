/**
 * Extração do bloco `cena.budget.v1` emitido pela ferramenta 04 (Orçamento).
 *
 * Contrato autoritativo: `ARCHITECTURE.md` → ADR-013. Pontos que este módulo
 * assume e que não devem ser relaxados sem mudar o ADR:
 *
 * - o bloco vem entre as linhas sentinela `<<<CENA_BUDGET_JSON` /
 *   `CENA_BUDGET_JSON>>>` (não é cerca de código, que é proibida pelas regras
 *   globais de formatação de `generateForTool`);
 * - valores em **reais** como número JSON; a conversão para os centavos do banco
 *   é do consumidor (`Math.round(valor * 100)`);
 * - `margin` nunca entra no baseline — é só exibição;
 * - `total` do modelo é ignorado: `totalAmount` é Σ do valor escolhido;
 * - sem fallback de parsing de prosa. Bloco ausente/inválido desabilita a ponte.
 *
 * Decisões que a A4.4 tomou onde o ADR só dava o limite, e que valem como
 * contrato deste módulo:
 *
 * - **Mais de 12 rubricas:** mantém as 12 primeiras válidas e reporta as demais
 *   em `dropped` ("acima do limite de 12 rubricas"). Invalidar o bloco inteiro
 *   por excesso jogaria fora dado bom por causa de verbosidade do modelo — e o
 *   usuário ainda revisa tudo no diálogo antes de gravar.
 * - **Bloco acima de 4 KB:** inválido com `reason: "malformed"`, sem tentar
 *   `JSON.parse`. Bloco gigante é sintoma de resposta descontrolada, não de
 *   orçamento detalhado.
 * - **Chaves repetidas:** `extractBudgetBlock` devolve as rubricas como o modelo
 *   as emitiu (o diálogo mostra o que veio); a soma acontece no consumidor,
 *   `buildBaselinePayload`, porque `Budget.categories` não aceita nome repetido.
 *   O `label` da linha somada é o da **primeira** ocorrência da chave, que é a
 *   que o modelo escolheu antes de se repetir. Chaves distintas com o mesmo
 *   `label` não são somadas (`key` é o identificador, `label` é texto livre).
 *
 * A remoção do bloco na exibição/cópia/export/contexto usa `stripBudgetBlock`,
 * que vive em `shared/budgetBlock.ts` porque o servidor também precisa dela.
 */

export {
  BUDGET_BLOCK_SCHEMA,
  BUDGET_BLOCK_START,
  BUDGET_BLOCK_END,
  BUDGET_BLOCK_MAX_BYTES,
  BUDGET_BLOCK_MAX_CATEGORIES,
  stripBudgetBlock,
} from "@shared/budgetBlock";

import {
  BUDGET_BLOCK_END,
  BUDGET_BLOCK_MAX_BYTES,
  BUDGET_BLOCK_MAX_CATEGORIES,
  BUDGET_BLOCK_SCHEMA,
  BUDGET_BLOCK_START,
  budgetBlockByteLength,
} from "@shared/budgetBlock";

/** Conjunto fechado de chaves do contrato. Chave desconhecida vira `outros`. */
export const BUDGET_CATEGORY_KEYS = [
  "preproducao",
  "equipe",
  "equipamento",
  "locacao",
  "arte",
  "alimentacao",
  "transporte",
  "posproducao",
  "administrativo",
  "outros",
] as const;

export type BudgetCategoryKey = (typeof BUDGET_CATEGORY_KEYS)[number];

/** Faixa de uma rubrica, em reais (não centavos). */
export interface BudgetBlockCategory {
  key: BudgetCategoryKey;
  label: string;
  min: number;
  max: number;
}

/** Rubrica descartada na validação — listada no diálogo para o usuário saber. */
export interface DroppedBudgetCategory {
  /** Melhor rótulo disponível (label, chave ou posição no array). */
  label: string;
  /** Motivo legível, em português, do descarte. */
  reason: string;
}

/**
 * `absent`   — sem sentinela no output (inclui gerações anteriores à A4.2)
 * `malformed`— sentinela presente mas JSON inválido
 * `schema`   — JSON válido com `schema` diferente de `cena.budget.v1`
 * `empty`    — schema certo, mas zero categorias válidas
 */
export type BudgetBlockInvalidReason = "absent" | "malformed" | "schema" | "empty";

export interface BudgetBlockValid {
  ok: true;
  currency: string;
  categories: BudgetBlockCategory[];
  /** Margem da produtora — exibição apenas, nunca entra no baseline. */
  margin: { min: number; max: number } | null;
  assumptions: string | null;
  dropped: DroppedBudgetCategory[];
}

export interface BudgetBlockInvalid {
  ok: false;
  reason: BudgetBlockInvalidReason;
  dropped: DroppedBudgetCategory[];
}

export type BudgetBlockResult = BudgetBlockValid | BudgetBlockInvalid;

/** Qual extremo da faixa vira `budgeted`. Teto é o padrão (ver ADR-013). */
export type BudgetBound = "min" | "max";

export interface BudgetBaselinePayload {
  /** Σ do valor escolhido, em centavos. */
  totalAmount: number;
  currency: string;
  /** `Budget.categories` — nome exibido + valor em centavos. */
  categories: Array<{ name: string; budgeted: number }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function parseRange(value: unknown): { min: number; max: number } | null {
  if (!isRecord(value)) return null;
  const min = finiteAmount(value.min);
  const max = finiteAmount(value.max);
  if (min === null || max === null || min > max) return null;
  return { min, max };
}

function normalizeKey(value: unknown): BudgetCategoryKey {
  if (typeof value !== "string") return "outros";
  const candidate = value.trim().toLowerCase();
  return (BUDGET_CATEGORY_KEYS as readonly string[]).includes(candidate)
    ? (candidate as BudgetCategoryKey)
    : "outros";
}

/** Isola o texto entre as sentinelas. Última ocorrência ganha (o bloco é o fim da resposta). */
function sliceBlock(output: string): string | null {
  const start = output.lastIndexOf(BUDGET_BLOCK_START);
  if (start === -1) return null;
  const contentStart = start + BUDGET_BLOCK_START.length;
  const end = output.indexOf(BUDGET_BLOCK_END, contentStart);
  if (end === -1) return null;
  return output.slice(contentStart, end).trim();
}

/**
 * Extrai e valida o bloco estruturado de um output de geração.
 *
 * Nunca lança: qualquer problema volta como `{ ok: false, reason }`, porque a UI
 * precisa apenas decidir entre abrir o diálogo ou ficar inerte.
 */
export function extractBudgetBlock(output: string | null | undefined): BudgetBlockResult {
  if (typeof output !== "string" || !output.includes(BUDGET_BLOCK_START)) {
    return { ok: false, reason: "absent", dropped: [] };
  }

  const raw = sliceBlock(output);
  if (!raw) return { ok: false, reason: "absent", dropped: [] };

  // Bloco acima do limite não é parseado: ADR-013 fixa 4 KB, e resposta maior
  // que isso é descontrole do modelo, não orçamento detalhado.
  if (budgetBlockByteLength(raw) > BUDGET_BLOCK_MAX_BYTES) {
    return { ok: false, reason: "malformed", dropped: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "malformed", dropped: [] };
  }

  if (!isRecord(parsed)) return { ok: false, reason: "malformed", dropped: [] };
  if (parsed.schema !== BUDGET_BLOCK_SCHEMA) return { ok: false, reason: "schema", dropped: [] };

  const dropped: DroppedBudgetCategory[] = [];
  const categories: BudgetBlockCategory[] = [];
  const rawCategories = Array.isArray(parsed.categories) ? parsed.categories : [];

  rawCategories.forEach((entry, index) => {
    const fallbackLabel = `Rubrica ${index + 1}`;
    if (!isRecord(entry)) {
      dropped.push({ label: fallbackLabel, reason: "formato inesperado" });
      return;
    }
    const key = normalizeKey(entry.key);
    const label =
      typeof entry.label === "string" && entry.label.trim()
        ? entry.label.trim()
        : typeof entry.key === "string" && entry.key.trim()
          ? entry.key.trim()
          : "";
    const range = parseRange(entry);

    if (!label) {
      dropped.push({ label: fallbackLabel, reason: "sem nome" });
      return;
    }
    if (!range) {
      dropped.push({ label, reason: "valores inválidos (piso/teto)" });
      return;
    }
    if (categories.length >= BUDGET_BLOCK_MAX_CATEGORIES) {
      dropped.push({
        label,
        reason: `acima do limite de ${BUDGET_BLOCK_MAX_CATEGORIES} rubricas`,
      });
      return;
    }
    categories.push({ key, label, min: range.min, max: range.max });
  });

  if (categories.length === 0) return { ok: false, reason: "empty", dropped };

  const currency =
    typeof parsed.currency === "string" && /^[A-Za-z]{3}$/.test(parsed.currency.trim())
      ? parsed.currency.trim().toUpperCase()
      : "BRL";

  const assumptions =
    typeof parsed.assumptions === "string" && parsed.assumptions.trim()
      ? parsed.assumptions.trim()
      : null;

  return {
    ok: true,
    currency,
    categories,
    margin: parseRange(parsed.margin),
    assumptions,
    dropped,
  };
}

/** Σ do extremo escolhido, em reais. */
export function budgetBlockTotal(categories: BudgetBlockCategory[], bound: BudgetBound): number {
  return categories.reduce((sum, category) => sum + category[bound], 0);
}

/**
 * Soma rubricas que repetem a mesma `key`, preservando a ordem de aparição.
 * O `label` da linha resultante é o da primeira ocorrência (ver doc do módulo).
 */
export function mergeDuplicateCategories(
  categories: BudgetBlockCategory[],
): BudgetBlockCategory[] {
  const byKey = new Map<BudgetCategoryKey, BudgetBlockCategory>();
  for (const category of categories) {
    const existing = byKey.get(category.key);
    if (!existing) {
      byKey.set(category.key, { ...category });
      continue;
    }
    existing.min += category.min;
    existing.max += category.max;
  }
  return Array.from(byKey.values());
}

/**
 * Monta o corpo do `PUT /api/budgets/:projectId` a partir do bloco extraído.
 * `margin` fica fora por decisão do ADR-013, chaves repetidas são somadas aqui
 * (`Budget.categories` não aceita nome duplicado) e o total é recalculado.
 */
export function buildBaselinePayload(
  block: BudgetBlockValid,
  bound: BudgetBound,
): BudgetBaselinePayload {
  const categories = mergeDuplicateCategories(block.categories).map((category) => ({
    name: category.label,
    budgeted: Math.round(category[bound] * 100),
  }));
  return {
    totalAmount: categories.reduce((sum, category) => sum + category.budgeted, 0),
    currency: block.currency,
    categories,
  };
}
