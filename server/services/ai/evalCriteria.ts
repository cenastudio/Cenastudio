/**
 * Avaliação de critérios de aceite do eval de IA (Fase D do spec
 * `qualidade-raciocinio-ia`).
 *
 * Por que critérios tipados em vez de texto livre: o `design.md` escrevia os
 * critérios como frases ("Total entre R$ 8k-15k", "Disclaimer sobre validar
 * valores"). Frase não decide nada sozinha — alguém tem de ler a saída e julgar,
 * e o julgamento muda de humor entre uma execução e outra. Como o eval existe
 * para escolher modelo (`TIER_MODEL.high`, ADR-014), ele precisa produzir o
 * mesmo número duas vezes seguidas. Então cada critério carrega um `check`
 * executável, e a frase fica no `description`, para o relatório ficar legível.
 *
 * O que **não** dá para automatizar honestamente (se o roteiro é bom, se o
 * moodboard é bonito) usa `type: "manual"`: entra no relatório como não julgado,
 * fora do numerador e do denominador. Critério de gosto disfarçado de assert
 * viraria número falso, que é pior que número ausente.
 *
 * Este módulo é puro de propósito: nenhuma chamada de rede, nenhum acesso a
 * banco. Quem fala com o provedor é `scripts/run-ai-eval.ts`.
 */

// Mesmo extrator que a ponte da UI usa (ADR-013). Reimplementar a validação do
// bloco aqui mediria o eval, não o produto — é a mesma razão registrada em
// `scripts/measure-budget-block.ts`.
import { extractBudgetBlock } from "../../../client/src/lib/budgetBlock.js";

/** Tokens que as regras globais de formatação proíbem (ver `OUTPUT_STYLE_PT`). */
const MARKDOWN_TOKENS: Array<{ label: string; pattern: RegExp }> = [
  { label: "negrito/itálico (**, *)", pattern: /(\*\*|(?<![\w*])\*(?!\s|\*))/ },
  { label: "cabeçalho (#)", pattern: /^#{1,6}\s/m },
  { label: "bullet com - ou *", pattern: /^\s*[-*]\s+/m },
  { label: "cerca de código (```)", pattern: /```/ },
  { label: "regra horizontal (---)", pattern: /^\s*---\s*$/m },
  { label: "citação (>)", pattern: /^\s*>\s/m },
];

export type EvalCheck =
  | { type: "includesAll"; values: string[] }
  | { type: "excludesAll"; values: string[] }
  | { type: "regex"; pattern: string; flags?: string; minMatches?: number }
  /**
   * Contrapartida de `regex`, para critério negativo ("não deve inventar
   * telefone", "não deve cravar ano de tabela de preço"). Sem este tipo, um
   * critério de ausência escrito como `regex` passa exatamente quando devia
   * reprovar — foi o que aconteceu no primeiro rascunho dos casos da 03.
   */
  | { type: "regexAbsent"; pattern: string; flags?: string }
  | { type: "noMarkdown" }
  | { type: "budgetBlock"; minCategories?: number }
  | { type: "currencyRange"; min: number; max: number }
  | { type: "minLength"; chars: number }
  | { type: "manual" };

export interface EvalCriterion {
  id: string;
  description: string;
  check: EvalCheck;
}

export interface EvalCase {
  id: string;
  input: Record<string, string>;
  acceptanceCriteria: EvalCriterion[];
}

export interface EvalFile {
  tool: string;
  slug: string;
  cases: EvalCase[];
}

export interface CriterionResult {
  id: string;
  description: string;
  /** `null` = critério manual, não julgado automaticamente. */
  passed: boolean | null;
  detail: string;
}

export interface CaseResult {
  caseId: string;
  results: CriterionResult[];
  /** Critérios automáticos aprovados / total de automáticos. */
  passed: number;
  total: number;
  manual: number;
}

/**
 * Todos os valores monetários da saída, em reais.
 *
 * Aceita `R$ 1.200`, `R$ 1.200,50` e `R$ 12.000 – R$ 18.000` (nesse caso os dois
 * extremos entram como valores separados). Ignora número sem `R$` na frente para
 * não confundir duração ("3 min"), quantidade de diárias ou horário com dinheiro.
 */
export function extractCurrencyValues(output: string): number[] {
  const values: number[] = [];
  const pattern = /R\$\s*([\d][\d.\s]*(?:,\d{1,2})?)/g;
  for (const match of output.matchAll(pattern)) {
    const raw = match[1].replace(/[.\s]/g, "").replace(",", ".");
    const value = Number(raw);
    if (Number.isFinite(value)) values.push(value);
  }
  return values;
}

function runCheck(output: string, check: EvalCheck): { passed: boolean | null; detail: string } {
  switch (check.type) {
    case "manual":
      return { passed: null, detail: "julgamento humano — fora do placar" };

    case "includesAll": {
      const haystack = output.toLowerCase();
      const missing = check.values.filter((v) => !haystack.includes(v.toLowerCase()));
      return missing.length === 0
        ? { passed: true, detail: `${check.values.length} termo(s) presente(s)` }
        : { passed: false, detail: `ausente(s): ${missing.join(", ")}` };
    }

    case "excludesAll": {
      const haystack = output.toLowerCase();
      const present = check.values.filter((v) => haystack.includes(v.toLowerCase()));
      return present.length === 0
        ? { passed: true, detail: "nenhum termo proibido" }
        : { passed: false, detail: `presente(s) indevidamente: ${present.join(", ")}` };
    }

    case "regex": {
      const flags = check.flags?.includes("g") ? check.flags : `${check.flags || ""}g`;
      const matches = [...output.matchAll(new RegExp(check.pattern, flags))];
      const need = check.minMatches ?? 1;
      return matches.length >= need
        ? { passed: true, detail: `${matches.length} ocorrência(s) (mín. ${need})` }
        : { passed: false, detail: `${matches.length} ocorrência(s), esperado ≥ ${need}` };
    }

    case "regexAbsent": {
      const flags = check.flags?.includes("g") ? check.flags : `${check.flags || ""}g`;
      const matches = [...output.matchAll(new RegExp(check.pattern, flags))];
      return matches.length === 0
        ? { passed: true, detail: "padrão ausente, como esperado" }
        : {
            passed: false,
            detail: `${matches.length} ocorrência(s) indevida(s): ${matches
              .slice(0, 3)
              .map((m) => m[0])
              .join(" | ")}`,
          };
    }

    case "noMarkdown": {
      const hits = MARKDOWN_TOKENS.filter((token) => token.pattern.test(output));
      return hits.length === 0
        ? { passed: true, detail: "sem markdown" }
        : { passed: false, detail: `markdown proibido: ${hits.map((h) => h.label).join(", ")}` };
    }

    case "budgetBlock": {
      const result = extractBudgetBlock(output);
      if (!result.ok) {
        return { passed: false, detail: `bloco inválido (${result.reason})` };
      }
      const min = check.minCategories ?? 1;
      const count = result.categories.length;
      return count >= min
        ? { passed: true, detail: `bloco válido, ${count} rubrica(s)` }
        : { passed: false, detail: `bloco válido mas só ${count} rubrica(s), esperado ≥ ${min}` };
    }

    case "currencyRange": {
      const values = extractCurrencyValues(output);
      if (values.length === 0) {
        return { passed: false, detail: "nenhum valor em R$ encontrado" };
      }
      // O maior valor da resposta é o total (ou o teto da faixa do total). É o
      // número que o usuário leva para o cliente, então é o que a faixa julga.
      const top = Math.max(...values);
      const ok = top >= check.min && top <= check.max;
      return {
        passed: ok,
        detail: `maior valor R$ ${top.toLocaleString("pt-BR")} (faixa ${check.min}–${check.max})`,
      };
    }

    case "minLength":
      return output.length >= check.chars
        ? { passed: true, detail: `${output.length} caracteres` }
        : { passed: false, detail: `${output.length} caracteres, esperado ≥ ${check.chars}` };
  }
}

export function evaluateCase(output: string, evalCase: EvalCase): CaseResult {
  const results = evalCase.acceptanceCriteria.map<CriterionResult>((criterion) => {
    const { passed, detail } = runCheck(output, criterion.check);
    return { id: criterion.id, description: criterion.description, passed, detail };
  });

  const automatic = results.filter((r) => r.passed !== null);
  return {
    caseId: evalCase.id,
    results,
    passed: automatic.filter((r) => r.passed === true).length,
    total: automatic.length,
    manual: results.length - automatic.length,
  };
}

/**
 * Validação estrutural de um arquivo de eval, para o runner falhar cedo com
 * mensagem útil em vez de estourar no meio de uma bateria de chamadas pagas em
 * latência.
 */
export function validateEvalFile(data: unknown, source: string): EvalFile {
  const fail = (message: string): never => {
    throw new Error(`${source}: ${message}`);
  };
  if (typeof data !== "object" || data === null) return fail("raiz precisa ser um objeto");
  const file = data as Partial<EvalFile>;
  if (typeof file.tool !== "string" || !/^\d{2}$/.test(file.tool)) {
    return fail('campo "tool" precisa ser o id de 2 dígitos da ferramenta (ex.: "04")');
  }
  if (typeof file.slug !== "string" || !file.slug) return fail('campo "slug" obrigatório');
  if (!Array.isArray(file.cases) || file.cases.length === 0) {
    return fail('campo "cases" precisa ser um array não vazio');
  }

  const seen = new Set<string>();
  for (const [index, evalCase] of file.cases.entries()) {
    const where = `cases[${index}]`;
    if (!evalCase || typeof evalCase.id !== "string" || !evalCase.id) {
      return fail(`${where}.id obrigatório`);
    }
    if (seen.has(evalCase.id)) return fail(`${where}.id duplicado: ${evalCase.id}`);
    seen.add(evalCase.id);
    if (typeof evalCase.input !== "object" || evalCase.input === null) {
      return fail(`${where}.input precisa ser um objeto de campos do formulário`);
    }
    if (Object.values(evalCase.input).filter(Boolean).length === 0) {
      return fail(`${where}.input não pode ser vazio — não haveria o que gerar`);
    }
    if (!Array.isArray(evalCase.acceptanceCriteria) || evalCase.acceptanceCriteria.length === 0) {
      return fail(`${where}.acceptanceCriteria precisa ter ao menos 1 critério`);
    }
    for (const [ci, criterion] of evalCase.acceptanceCriteria.entries()) {
      const cwhere = `${where}.acceptanceCriteria[${ci}]`;
      if (!criterion?.id || !criterion?.description) {
        return fail(`${cwhere} precisa de id e description`);
      }
      if (!criterion.check || typeof criterion.check.type !== "string") {
        return fail(`${cwhere}.check.type obrigatório`);
      }
      // Regex inválida só apareceria no meio da execução; melhor agora.
      if (criterion.check.type === "regex" || criterion.check.type === "regexAbsent") {
        try {
          new RegExp(criterion.check.pattern, criterion.check.flags);
        } catch (error) {
          return fail(`${cwhere}.check.pattern inválido: ${(error as Error).message}`);
        }
      }
    }
  }

  return file as EvalFile;
}
