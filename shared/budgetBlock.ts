/**
 * Sentinelas e remoção do bloco `cena.budget.v1` (ADR-013).
 *
 * Vive em `shared/` porque a remoção precisa acontecer nos dois lados:
 * no cliente (exibição, cópia, export, prompt de refino) e no servidor
 * (`buildProjectContext`, que reinjeta `generations.output` em prompts
 * posteriores). Uma implementação só, para os dois caminhos não divergirem.
 *
 * A validação/extração continua em `client/src/lib/budgetBlock.ts`, que
 * reexporta o que está aqui — nenhum consumidor precisa saber da divisão.
 */

export const BUDGET_BLOCK_SCHEMA = "cena.budget.v1";
export const BUDGET_BLOCK_START = "<<<CENA_BUDGET_JSON";
export const BUDGET_BLOCK_END = "CENA_BUDGET_JSON>>>";

/**
 * Limite de tamanho do conteúdo entre as sentinelas, em bytes UTF-8 (ADR-013).
 * Acima disso o bloco é tratado como inválido sem tentativa de parse.
 */
export const BUDGET_BLOCK_MAX_BYTES = 4 * 1024;

/** Máximo de rubricas aceitas por bloco (ADR-013). */
export const BUDGET_BLOCK_MAX_CATEGORIES = 12;

/** Tamanho em bytes UTF-8, para comparar com `BUDGET_BLOCK_MAX_BYTES`. */
export function budgetBlockByteLength(content: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(content).length;
  // Ambiente sem TextEncoder: aproximação conservadora por unidade UTF-16.
  return content.length;
}

/**
 * Remove o bloco estruturado de um output de geração.
 *
 * Regras:
 * - remove todas as ocorrências, não só a última;
 * - sentinela de abertura sem fechamento (resposta truncada) faz o restante do
 *   texto ser descartado — vazar meio bloco de JSON para o documento é pior que
 *   perder a cauda de uma geração já quebrada;
 * - colapsa a linha em branco que sobra e apara as pontas.
 *
 * Não é o inverso de `extractBudgetBlock`: aqui não há validação nenhuma, é
 * higiene de texto e roda em output de qualquer época.
 */
export function stripBudgetBlock(output: string | null | undefined): string {
  if (typeof output !== "string") return "";
  if (!output.includes(BUDGET_BLOCK_START)) return output;

  let result = "";
  let cursor = 0;

  for (;;) {
    const start = output.indexOf(BUDGET_BLOCK_START, cursor);
    if (start === -1) {
      result += output.slice(cursor);
      break;
    }
    result += output.slice(cursor, start);
    const end = output.indexOf(BUDGET_BLOCK_END, start + BUDGET_BLOCK_START.length);
    if (end === -1) break; // bloco sem fechamento: descarta a cauda
    cursor = end + BUDGET_BLOCK_END.length;
  }

  return result
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
