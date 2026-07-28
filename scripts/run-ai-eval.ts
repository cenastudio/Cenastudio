/**
 * Fase D — runner do eval de IA.
 *
 * Roda os casos de `server/services/ai/__evals__/*.eval.json` contra um modelo
 * fixo e imprime aprovado/reprovado por critério. Existe para responder uma
 * pergunta só: qual modelo atende a faixa de alta criticidade do ADR-014, cuja
 * escolha hoje é provisória e sem eval por trás.
 *
 * Uso:
 *   npm run eval:ai -- --dry-run                       # valida os arquivos, sem chamar modelo
 *   npm run eval:ai -- --tool=04
 *   npm run eval:ai -- --tool=04 --model=nvidia/nemotron-3-ultra-550b-a55b:free
 *   npm run eval:ai -- --tier=high                     # as 4 ferramentas de alta criticidade
 *   npm run eval:ai -- --tool=04 --case=orcamento-clipe-1-diaria
 *   npm run eval:ai -- --tier=high --prompt-file=tmp/prompts-antigos.json
 *   npm run eval:ai -- --tier=high --save=tmp/eval-laguna.json
 *
 * Decisões deste script, herdadas de `scripts/measure-budget-block.ts` pelo mesmo
 * motivo (o número medido tem de significar algo):
 *
 * - **Mesmo system prompt da geração real** (`buildToolSystemPrompt`), incluindo
 *   as regras globais de formatação. Sem elas o critério `noMarkdown` mediria
 *   outro sistema.
 * - **Mesma amostragem da ferramenta** (`resolveToolSampling`): comparar modelos
 *   com temperatura diferente da de produção compara outra coisa.
 * - **Modelo fixo por execução, sem cadeia de fallback.** `generateWithOpenRouter`
 *   troca de modelo em 429/5xx, o que em produção é resiliência e aqui
 *   misturaria dois modelos no mesmo placar.
 * - **Não grava nada.** Não passa por `generateForTool`: nada em `generations`,
 *   nada em `usage`, nenhuma cota de plano consumida.
 *
 * `--prompt-file` é o que permite a comparação "prompt antigo vs. novo" da task
 * 14: um JSON `{ "04": "texto do promptRole antigo" }` sobrepõe o `promptRole`
 * atual. Extrair a versão antiga é trabalho do git, não deste script.
 */

import "dotenv/config";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getToolById } from "../shared/tools.js";
import {
  buildToolSystemPrompt,
  resolveToolCriticality,
  resolveToolModel,
  resolveToolSampling,
  HIGH_CRITICALITY_TOOLS,
  MEDIUM_CRITICALITY_TOOLS,
  CREATIVE_TOOLS,
  type CriticalityTier,
} from "../server/services/aiService.js";
import {
  evaluateCase,
  validateEvalFile,
  type CaseResult,
  type EvalFile,
} from "../server/services/ai/evalCriteria.js";

const EVALS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../server/services/ai/__evals__");

interface Options {
  tools: string[] | null;
  tier: CriticalityTier | null;
  caseId: string | null;
  model: string | null;
  promptFile: string | null;
  save: string | null;
  dryRun: boolean;
}

function parseOptions(argv: string[]): Options {
  const flag = (name: string) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };
  const tier = flag("tier");
  if (tier && !["high", "medium", "creative"].includes(tier)) {
    throw new Error("--tier deve ser high, medium ou creative");
  }
  const tool = flag("tool");
  return {
    tools: tool ? tool.split(",").map((t) => t.trim()) : null,
    tier: (tier as CriticalityTier) || null,
    caseId: flag("case"),
    model: flag("model"),
    promptFile: flag("prompt-file"),
    save: flag("save"),
    dryRun: argv.includes("--dry-run"),
  };
}

function toolsForTier(tier: CriticalityTier): string[] {
  if (tier === "high") return HIGH_CRITICALITY_TOOLS;
  if (tier === "medium") return MEDIUM_CRITICALITY_TOOLS;
  return CREATIVE_TOOLS;
}

function loadEvalFiles(options: Options): EvalFile[] {
  let names: string[];
  try {
    names = readdirSync(EVALS_DIR).filter((n) => n.endsWith(".eval.json"));
  } catch {
    throw new Error(`Pasta de eval não encontrada: ${EVALS_DIR}`);
  }
  if (names.length === 0) {
    throw new Error(
      `Nenhum arquivo *.eval.json em ${EVALS_DIR}. As tasks 11-13 do spec são o que preenche isso.`,
    );
  }

  const wanted = options.tools || (options.tier ? toolsForTier(options.tier) : null);
  const files: EvalFile[] = [];
  for (const name of names.sort()) {
    const path = join(EVALS_DIR, name);
    const file = validateEvalFile(JSON.parse(readFileSync(path, "utf8")), name);
    if (wanted && !wanted.includes(file.tool)) continue;
    files.push(
      options.caseId
        ? { ...file, cases: file.cases.filter((c) => c.id === options.caseId) }
        : file,
    );
  }

  const withCases = files.filter((f) => f.cases.length > 0);
  if (withCases.length === 0) {
    throw new Error(
      options.caseId
        ? `Nenhum caso com id "${options.caseId}" nos arquivos selecionados`
        : "Nenhum arquivo de eval corresponde ao filtro de ferramenta/faixa",
    );
  }
  return withCases;
}

function loadPromptOverrides(path: string | null): Record<string, string> {
  if (!path) return {};
  const data = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const overrides: Record<string, string> = {};
  for (const [toolId, promptRole] of Object.entries(data)) {
    if (typeof promptRole !== "string" || !promptRole.trim()) {
      throw new Error(`--prompt-file: valor de "${toolId}" precisa ser o promptRole como string`);
    }
    overrides[toolId] = promptRole;
  }
  return overrides;
}

/** Chamada direta ao provedor: modelo fixo, sem a cadeia de fallback. */
async function callModel(system: string, userText: string, model: string, toolId: string) {
  const sampling = resolveToolSampling(toolId);
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
        temperature: sampling.temperature,
        top_p: sampling.top_p,
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
    return output;
  } finally {
    clearTimeout(timeout);
  }
}

function printCase(result: CaseResult) {
  const score = `${result.passed}/${result.total}`;
  const manual = result.manual > 0 ? ` (+${result.manual} manual)` : "";
  console.log(`    ${result.passed === result.total ? "✓" : "✗"} ${result.caseId} — ${score}${manual}`);
  for (const criterion of result.results) {
    const mark = criterion.passed === null ? "·" : criterion.passed ? "✓" : "✗";
    // Critério aprovado não precisa de detalhe: só o que falhou (ou o que
    // depende de humano) merece linha explicativa no relatório.
    const detail = criterion.passed === true ? "" : ` — ${criterion.detail}`;
    console.log(`        ${mark} ${criterion.description}${detail}`);
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const files = loadEvalFiles(options);
  const overrides = loadPromptOverrides(options.promptFile);

  const totalCases = files.reduce((sum, f) => sum + f.cases.length, 0);
  console.log(`Arquivos de eval: ${files.length} | casos: ${totalCases}`);
  if (options.promptFile) {
    console.log(`Prompt sobreposto para: ${Object.keys(overrides).join(", ") || "(nenhum)"}`);
  }

  if (options.dryRun) {
    // Valida forma dos arquivos e monta os prompts sem chamar o provedor. É como
    // se checa o runner sem gastar latência nem cota.
    for (const file of files) {
      const tool = getToolById(file.tool);
      if (!tool) throw new Error(`Ferramenta ${file.tool} não existe em shared/tools.ts`);
      const promptRole = overrides[file.tool] ?? tool.promptRole;
      const system = buildToolSystemPrompt({ name: tool.name, promptRole });
      const criteria = file.cases.reduce((n, c) => n + c.acceptanceCriteria.length, 0);
      const manual = file.cases.reduce(
        (n, c) => n + c.acceptanceCriteria.filter((x) => x.check.type === "manual").length,
        0,
      );
      console.log(
        `  ${file.tool} ${file.slug} — ${file.cases.length} caso(s), ${criteria} critério(s) ` +
          `(${manual} manual), faixa ${resolveToolCriticality(file.tool)}, ` +
          `amostragem ${resolveToolSampling(file.tool).temperature}, ` +
          `prompt ${system.length} chars`,
      );
    }
    console.log("\n--dry-run: arquivos válidos, nenhuma chamada feita.");
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    console.error(
      "OPENROUTER_API_KEY não configurada — nada foi avaliado.\n" +
        "Rode com --dry-run para validar os arquivos sem chamar modelo.",
    );
    process.exit(1);
  }

  const report: Array<{
    tool: string;
    slug: string;
    model: string;
    cases: CaseResult[];
    transportFailures: Array<{ caseId: string; message: string }>;
  }> = [];

  for (const file of files) {
    const tool = getToolById(file.tool);
    if (!tool) throw new Error(`Ferramenta ${file.tool} não existe em shared/tools.ts`);
    const model =
      options.model || resolveToolModel(file.tool) || process.env.OPENROUTER_MODEL || "";
    const promptRole = overrides[file.tool] ?? tool.promptRole;
    const system = buildToolSystemPrompt({ name: tool.name, promptRole });

    console.log(
      `\n${file.tool} ${file.slug} — modelo ${model || "(padrão do provedor)"} ` +
        `| faixa ${resolveToolCriticality(file.tool)} ` +
        `| temp ${resolveToolSampling(file.tool).temperature}`,
    );

    const cases: CaseResult[] = [];
    const transportFailures: Array<{ caseId: string; message: string }> = [];

    for (const evalCase of file.cases) {
      const userText = Object.values(evalCase.input).filter(Boolean).join("\n\n");
      process.stdout.write(`  ${evalCase.id} ... `);
      try {
        const output = await callModel(system, userText, model, file.tool);
        console.log("gerado");
        const result = evaluateCase(output, evalCase);
        cases.push(result);
        printCase(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`erro de transporte (${message})`);
        transportFailures.push({ caseId: evalCase.id, message });
      }
    }

    report.push({ tool: file.tool, slug: file.slug, model, cases, transportFailures });
  }

  console.log("\n─── Placar ───");
  let grandPassed = 0;
  let grandTotal = 0;
  for (const entry of report) {
    const passed = entry.cases.reduce((n, c) => n + c.passed, 0);
    const total = entry.cases.reduce((n, c) => n + c.total, 0);
    const fullyGreen = entry.cases.filter((c) => c.passed === c.total).length;
    grandPassed += passed;
    grandTotal += total;
    const pct = total > 0 ? ((passed / total) * 100).toFixed(0) : "—";
    console.log(
      `${entry.tool} ${entry.slug}: ${passed}/${total} critérios (${pct}%), ` +
        `${fullyGreen}/${entry.cases.length} casos 100% verdes` +
        (entry.transportFailures.length
          ? ` — ${entry.transportFailures.length} caso(s) fora do placar por falha de transporte`
          : ""),
    );
  }
  if (grandTotal === 0) {
    console.error("\nNenhum critério avaliado: o eval NÃO mediu nada.");
    process.exit(1);
  }
  console.log(
    `TOTAL: ${grandPassed}/${grandTotal} (${((grandPassed / grandTotal) * 100).toFixed(1)}%)`,
  );

  if (options.save) {
    const payload = {
      ranAt: new Date().toISOString(),
      modelOverride: options.model,
      promptFile: options.promptFile,
      grandPassed,
      grandTotal,
      report,
    };
    mkdirSync(dirname(options.save), { recursive: true });
    writeFileSync(options.save, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`\nRelatório salvo em ${options.save}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
