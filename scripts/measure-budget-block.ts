/**
 * A4.6 — Parte 2: taxa de bloco inválido do modelo real.
 *
 * Mede quantas gerações da ferramenta 04 (Orçamento) saem com o bloco
 * `cena.budget.v1` extraível (ADR-013) e quantas caem em cada motivo de
 * invalidez (`absent`, `malformed`, `schema`, `empty`). A ponte Orçamento IA →
 * módulo só funciona quando o bloco vem válido, então essa taxa é a métrica de
 * saúde da A4 — e ela depende do modelo, não do nosso código.
 *
 * Como roda:
 *   npm run measure:budget-block              # 5 gerações, modelo da ferramenta 04
 *   npm run measure:budget-block -- --runs=3
 *   npm run measure:budget-block -- --model=qwen/qwen3-next-80b-a3b-instruct:free
 *   npm run measure:budget-block -- --save=tmp/medicao.json
 *
 * Decisões deste script, para o número medido significar algo:
 *
 * - **Mesmo system prompt da geração real.** Usa `buildToolSystemPrompt` de
 *   `aiService`, não uma cópia. As regras globais de formatação fazem parte do
 *   prompt e são a razão de o bloco usar sentinela em texto puro; medir sem elas
 *   mediria outro sistema.
 * - **Mesmo extrator da UI.** Classifica com `extractBudgetBlock`, o mesmo
 *   módulo que o botão usa. Reimplementar a validação aqui mediria o script.
 * - **Modelo fixo por execução, sem cadeia de fallback.** `generateWithOpenRouter`
 *   troca de modelo em 429/5xx — ótimo em produção, veneno numa medição, porque
 *   misturaria modelos diferentes na mesma taxa. Aqui a chamada é direta e uma
 *   falha de rede é contabilizada como erro de transporte, fora do denominador.
 * - **Não grava nada.** Não passa por `generateForTool`, então não escreve em
 *   `generations`/`usage` nem consome cota de plano do usuário. Só a cota do
 *   provedor é consumida (uma chamada por rodada).
 *
 * Sem `OPENROUTER_API_KEY` o script sai com código 1 e diz que não mediu. Não
 * existe modo "estimado": número inventado de taxa de erro de modelo é pior que
 * a ausência do número.
 */

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getToolById } from "../shared/tools.js";
import {
  buildToolSystemPrompt,
  resolveToolModel,
  resolveToolSampling,
} from "../server/services/aiService.js";
import {
  extractBudgetBlock,
  buildBaselinePayload,
  BUDGET_BLOCK_START,
  BUDGET_BLOCK_SCHEMA,
  type BudgetBlockResult,
} from "../client/src/lib/budgetBlock.js";

const TOOL_ID = "04";

/**
 * Briefings representativos, do curto ao adverso. A ordem importa: o script
 * cicla nesta lista, então `--runs=3` cobre os três primeiros cenários em vez de
 * repetir o mesmo três vezes.
 */
const BRIEFINGS: Array<{ name: string; input: Record<string, string> }> = [
  {
    name: "clipe musical 1 diária (caso do exemplo do prompt)",
    input: {
      projeto: "Clipe musical para banda independente",
      briefing:
        "Clipe de 3 minutos, 1 diária de 10h em Belo Horizonte, galpão alugado, " +
        "equipe reduzida, entrega em 3 semanas com color grading.",
    },
  },
  {
    name: "institucional 2 diárias em SP",
    input: {
      projeto: "Institucional industrial",
      briefing:
        "Institucional de 2 minutos para indústria em São Paulo capital. 2 diárias, " +
        "uma delas em fábrica com norma de segurança, entrevistas com 4 diretores, " +
        "motion graphics de dados no fim.",
    },
  },
  {
    name: "briefing mínimo (uma linha, sem números)",
    input: {
      projeto: "Vídeo curto para redes",
      briefing: "Preciso de um vídeo vertical de 30 segundos para Instagram.",
    },
  },
  {
    name: "briefing com valores próprios do usuário (ancoragem)",
    input: {
      projeto: "Campanha de varejo",
      briefing:
        "3 diárias em Curitiba. Meu diretor de fotografia cobra R$ 1.400/diária e " +
        "o rental do kit de câmera sai R$ 900/diária. Pós por entrega, 4 versões.",
    },
  },
  {
    name: "briefing longo com muitas rubricas possíveis",
    input: {
      projeto: "Documentário curto",
      briefing:
        "Documentário de 12 minutos, 5 diárias em 3 cidades (Belo Horizonte, Ouro Preto " +
        "e Diamantina), equipe de 6, drone, captação de som direto, 2 entrevistas com " +
        "tradução de libras, trilha original, legendagem em 2 idiomas, arte de cenário " +
        "em uma das locações, transporte e hospedagem para toda a equipe.",
    },
  },
];

type RunOutcome =
  | {
      kind: "ok";
      briefing: string;
      categories: number;
      total: number;
      dropped: number;
      finishReason: string;
      chars: number;
    }
  | {
      kind: "invalid";
      briefing: string;
      reason: string;
      sample: string;
      finishReason: string;
      chars: number;
      hasStartSentinel: boolean;
      looksLikeJson: boolean;
    }
  | { kind: "transport"; briefing: string; message: string };

interface Options {
  runs: number;
  model: string;
  save: string | null;
}

function parseOptions(argv: string[]): Options {
  const flag = (name: string) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };
  const runs = Number(flag("runs") || 5);
  if (!Number.isInteger(runs) || runs < 1 || runs > 50) {
    throw new Error("--runs deve ser um inteiro entre 1 e 50");
  }
  return {
    runs,
    model: flag("model") || resolveToolModel(TOOL_ID) || process.env.OPENROUTER_MODEL || "",
    save: flag("save"),
  };
}

/**
 * Chamada direta ao provedor: modelo fixo, sem a cadeia de fallback.
 *
 * Devolve também o `finish_reason` e o tamanho da saída porque eles separam duas
 * causas de bloco ausente que exigem consertos opostos: `length` (a resposta
 * estourou `max_tokens` antes de chegar ao bloco, que o ADR-013 põe no fim) pede
 * mais teto ou uma segunda chamada dedicada; `stop` com bloco ausente significa
 * que o modelo terminou de escrever e simplesmente não seguiu a instrução.
 */
async function callModel(
  system: string,
  userText: string,
  model: string,
): Promise<{ output: string; finishReason: string }> {
  const sampling = resolveToolSampling(TOOL_ID);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.OPENROUTER_TIMEOUT_MS || 180_000),
  );

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userText },
        ],
        // Amostragem da ferramenta 04 (perfil `precision`), não a global do
        // `.env`: medir com 0.7 mediria uma configuração que produção não usa
        // mais desde a Fase C.
        temperature: sampling.temperature,
        top_p: sampling.top_p,
        // Teto da ferramenta, igual à geração real, e com a mesma precedência
        // (ferramenta vence env). Medir com teto menor mediria truncamento nosso,
        // não qualidade do modelo — foi exatamente o que aconteceu nas primeiras
        // rodadas desta medição, com o 4096 do `.env`.
        max_tokens: sampling.max_tokens,
        stream: false,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${payload.error?.message || "sem detalhe"}`);
    }
    const output = payload.choices?.[0]?.message?.content?.trim();
    if (!output) throw new Error("resposta vazia do provedor");
    return { output, finishReason: payload.choices?.[0]?.finish_reason || "desconhecido" };
  } finally {
    clearTimeout(timeout);
  }
}

function describe(
  result: BudgetBlockResult,
  briefing: string,
  output: string,
  finishReason: string,
): RunOutcome {
  if (!result.ok) {
    // Cauda da resposta: é onde o bloco deveria estar, e é o que explica o motivo.
    const sample = output.slice(-240).replace(/\s+/g, " ").trim();
    return {
      kind: "invalid",
      briefing,
      reason: result.reason,
      sample,
      finishReason,
      chars: output.length,
      // Terceira causa possível de `absent`, e a que o motivo do extrator não
      // distingue: o modelo escreveu o JSON mas não escreveu a linha sentinela.
      // Sem essa checagem, "não seguiu a instrução do delimitador" e "não gerou
      // JSON nenhum" viram o mesmo número.
      hasStartSentinel: output.includes(BUDGET_BLOCK_START),
      looksLikeJson: output.includes(`"${BUDGET_BLOCK_SCHEMA}"`) || output.includes('"categories"'),
    };
  }
  // Fecha o ciclo da ponte: se o bloco é válido, o payload do baseline tem de sair.
  const payload = buildBaselinePayload(result, "max");
  return {
    kind: "ok",
    briefing,
    categories: payload.categories.length,
    total: payload.totalAmount,
    dropped: result.dropped.length,
    finishReason,
    chars: output.length,
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));

  if (!process.env.OPENROUTER_API_KEY) {
    console.error(
      "OPENROUTER_API_KEY não configurada — taxa de bloco inválido NÃO foi medida.\n" +
        "Configure a chave e rode de novo. O script não estima nem simula esse número.",
    );
    process.exit(1);
  }

  const tool = getToolById(TOOL_ID);
  if (!tool) throw new Error(`Ferramenta ${TOOL_ID} não encontrada em shared/tools.ts`);

  const system = buildToolSystemPrompt(tool, { locale: "pt" });
  console.log(`Ferramenta: ${TOOL_ID} — ${tool.name}`);
  console.log(`Modelo: ${options.model || "(padrão do provedor)"}`);
  console.log(`Rodadas: ${options.runs}`);
  console.log(`System prompt: ${system.length} caracteres\n`);

  const outcomes: RunOutcome[] = [];

  for (let index = 0; index < options.runs; index += 1) {
    const scenario = BRIEFINGS[index % BRIEFINGS.length];
    const userText = Object.values(scenario.input).filter(Boolean).join("\n\n");
    process.stdout.write(`[${index + 1}/${options.runs}] ${scenario.name} ... `);

    try {
      const { output, finishReason } = await callModel(system, userText, options.model);
      const outcome = describe(extractBudgetBlock(output), scenario.name, output, finishReason);
      outcomes.push(outcome);
      if (outcome.kind === "ok") {
        const reais = (outcome.total / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
        console.log(`válido (${outcome.categories} rubricas, teto ${reais})`);
      } else if (outcome.kind === "invalid") {
        console.log(
          `INVÁLIDO (${outcome.reason}) [finish_reason=${outcome.finishReason}, ` +
            `${outcome.chars} chars, sentinela=${outcome.hasStartSentinel ? "sim" : "não"}, ` +
            `json=${outcome.looksLikeJson ? "sim" : "não"}]`,
        );
        console.log(`      cauda: ${outcome.sample}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outcomes.push({ kind: "transport", briefing: scenario.name, message });
      console.log(`erro de transporte (${message})`);
    }
  }

  const measured = outcomes.filter((o) => o.kind !== "transport");
  const invalid = measured.filter((o) => o.kind === "invalid");
  const transport = outcomes.filter((o) => o.kind === "transport");

  console.log("\n─── Resultado ───");
  if (measured.length === 0) {
    console.error(
      "Nenhuma geração completou: taxa de bloco inválido NÃO foi medida " +
        `(${transport.length} falha(s) de transporte).`,
    );
    process.exit(1);
  }

  const rate = invalid.length / measured.length;
  console.log(`Gerações medidas: ${measured.length}`);
  console.log(`Bloco válido: ${measured.length - invalid.length}`);
  console.log(`Bloco inválido: ${invalid.length}`);
  console.log(`Taxa de bloco inválido: ${(rate * 100).toFixed(1)}%`);
  if (transport.length > 0) {
    console.log(
      `(${transport.length} rodada(s) fora do denominador por falha de transporte, não do modelo)`,
    );
  }

  const byReason = invalid.reduce<Record<string, number>>((acc, outcome) => {
    const reason = (outcome as { reason: string }).reason;
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});
  for (const [reason, count] of Object.entries(byReason)) {
    console.log(`  ${reason}: ${count}`);
  }

  if (options.save) {
    const report = {
      measuredAt: new Date().toISOString(),
      toolId: TOOL_ID,
      model: options.model,
      runs: options.runs,
      measured: measured.length,
      invalid: invalid.length,
      invalidRate: rate,
      byReason,
      transportFailures: transport.length,
      outcomes,
    };
    mkdirSync(dirname(options.save), { recursive: true });
    writeFileSync(options.save, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\nRelatório salvo em ${options.save}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
