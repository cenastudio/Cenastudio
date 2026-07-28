import { expect, test, type Page } from "@playwright/test";
import { attachConsoleErrors } from "./support/console";
import { loginAsAdmin } from "./support/auth";
import {
  cleanupTestData,
  createClientViaApi,
  createProjectViaApi,
  type TestProject,
} from "./support/factories";
import { isMobileProject } from "./support/mobile";

/**
 * A4.6 — fluxo completo da ponte Orçamento IA → módulo de Orçamento (ADR-013):
 * output com bloco → diálogo → confirmação → baseline persistido → valores
 * visíveis em `Budget.tsx`.
 *
 * O output da ferramenta 04 é semeado via `POST /api/projects/:id/state`, não
 * gerado por IA: o ADR diz que a ponte "funciona a partir do histórico" porque
 * o bloco fica persistido em `generations.output`/estado da ferramenta. Chamar o
 * modelo aqui gastaria quota e tornaria o teste não determinístico — a medição
 * de taxa de bloco inválido do modelo real é a Parte 2 da A4.6
 * (`npm run measure:budget-block`), não este spec.
 *
 * O caso mobile (alvo de toque, viewport) está em `budget-bridge-mobile.spec.ts`;
 * aqui a corrida é do fluxo de dados, então roda só no projeto desktop.
 */

/** Faixas do bloco: teto = 5500 + 3600 = 9100; piso = 3300 + 1800 = 5100. */
const SEEDED_OUTPUT = [
  "ORCAMENTO AUDIOVISUAL",
  "Estimativa em faixa — valide com 2-3 orcamentos reais de mercado.",
  "• Equipe: R$ 3.300 – R$ 5.500",
  "• Pos-producao: R$ 1.800 – R$ 3.600",
  "",
  "<<<CENA_BUDGET_JSON",
  JSON.stringify({
    schema: "cena.budget.v1",
    currency: "BRL",
    categories: [
      { key: "equipe", label: "Equipe", min: 3300, max: 5500 },
      { key: "posproducao", label: "Pós-produção", min: 1800, max: 3600 },
    ],
    margin: { min: 1690, max: 3080 },
    assumptions: "1 diária de 10h em BH, equipe de 3, pós por entrega",
  }),
  "CENA_BUDGET_JSON>>>",
].join("\n");

async function seedToolOutput(page: Page, projectId: string) {
  const response = await page.request.post(`/api/projects/${projectId}/state`, {
    data: { toolId: "04", formData: { projeto: "Teste ponte A4.6" }, outputData: SEEDED_OUTPUT },
  });
  expect(response.ok(), `seed de estado da ferramenta 04 falhou: ${response.status()}`).toBeTruthy();
}

/**
 * Valor de um dos cartões de resumo de `Budget.tsx` (Orçado / Realizado / Saldo).
 * Precisa ser ancorado pelo rótulo: com realizado = 0, "Orçado" e "Saldo"
 * mostram o mesmo número e um `getByText` do valor casa em dois nós.
 */
function cardValue(page: Page, label: string) {
  return page
    .locator("#main-content")
    .getByText(label, { exact: true })
    .locator("xpath=following-sibling::p[1]");
}

async function openBridgeDialog(page: Page, projectId: string) {
  await page.goto(`/project/${projectId}/studio/orcamento`);
  await page.waitForLoadState("networkidle");

  const trigger = page.getByRole("button", {
    name: /Usar este orçamento no módulo de Orçamento/i,
  });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("@budget-bridge fluxo completo da ponte de orçamento", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(isMobileProject(), "fluxo de dados: roda uma vez, no projeto desktop");
    attachConsoleErrors(page, testInfo);
    await loginAsAdmin(page);
  });

  test("@budget-bridge teto (padrão): bloco extraído vira baseline visível em Budget.tsx", async ({
    page,
  }) => {
    const client = await createClientViaApi(page);
    let project: TestProject | null = null;

    try {
      project = await createProjectViaApi(page, client.id);
      await seedToolOutput(page, project.id);

      const dialog = await openBridgeDialog(page, project.id);

      // Teto pré-selecionado (ADR-013) e projeto sem baseline: nada de aviso de
      // substituição, confirmação liberada de saída.
      await expect(dialog.getByRole("radio", { name: /Teto da faixa/i })).toBeChecked();
      await expect(dialog.getByText(/Salvar substitui as categorias existentes/i)).toHaveCount(0);
      await expect(dialog.getByText("R$ 9.100,00", { exact: true })).toBeVisible();
      // Margem aparece no diálogo mas não entra no baseline.
      await expect(dialog.getByText(/Não entra no orçamento/i)).toBeVisible();

      const confirm = dialog.getByRole("button", { name: /Confirmar e enviar/i });
      await expect(confirm).toBeEnabled();
      await confirm.click();

      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByText(/gravado no módulo do projeto/i)).toBeVisible();

      // Persistido de verdade: o servidor devolve o baseline em centavos.
      const overview = await page.request.get(`/api/budgets/${project.id}`);
      expect(overview.ok()).toBeTruthy();
      const data = (await overview.json()).data;
      expect(data.totalBudgeted).toBe(910_000);
      expect(data.currency).toBe("BRL");
      expect(data.byCategory).toEqual([
        { name: "Equipe", budgeted: 550_000, spent: 0, pct: 0 },
        { name: "Pós-produção", budgeted: 360_000, spent: 0, pct: 0 },
      ]);

      // E renderizado na tela de Orçamento do projeto.
      await page.goto(`/project/${project.id}/budget`);
      await page.waitForLoadState("networkidle");

      const main = page.locator("#main-content");
      await expect(main.getByRole("heading", { name: "Orçamento", exact: true })).toBeVisible();
      // Cartão "Orçado" (não o "Saldo", que aqui tem o mesmo valor: realizado = 0).
      await expect(cardValue(page, "Orçado")).toHaveText("R$ 9.100,00");
      await expect(main.getByText("Equipe", { exact: true })).toBeVisible();
      await expect(main.getByText("Pós-produção", { exact: true })).toBeVisible();
      await expect(main.getByText("R$ 0,00 / R$ 5.500,00")).toBeVisible();
      await expect(main.getByText("R$ 0,00 / R$ 3.600,00")).toBeVisible();
      // Nenhuma categoria nasce "Estourado": teto como orçado é o motivo do padrão.
      await expect(main.getByText("Estourado")).toHaveCount(0);
    } finally {
      await cleanupTestData(page, { projects: project ? [project] : [], clients: [client] });
    }
  });

  test("@budget-bridge baseline existente: exige confirmação e substitui as categorias", async ({
    page,
  }) => {
    const client = await createClientViaApi(page);
    let project: TestProject | null = null;

    try {
      project = await createProjectViaApi(page, client.id);

      // Baseline anterior, definido como se fosse pela tela: R$ 1.000,00 em Locação.
      const seedBaseline = await page.request.put(`/api/budgets/${project.id}`, {
        data: {
          totalAmount: 100_000,
          currency: "BRL",
          categories: [{ name: "Locação", budgeted: 100_000 }],
        },
      });
      expect(seedBaseline.ok()).toBeTruthy();

      await seedToolOutput(page, project.id);
      const dialog = await openBridgeDialog(page, project.id);

      // Aviso de substituição + confirmação travada até o usuário reconhecer.
      await expect(dialog.getByText(/Este projeto já tem orçamento definido/i)).toBeVisible();
      const confirm = dialog.getByRole("button", { name: /Confirmar e enviar/i });
      await expect(confirm).toBeDisabled();

      // Piso em vez do teto, para o caminho não-padrão também cair no banco.
      await dialog.getByRole("radio", { name: /Piso da faixa/i }).check();
      await expect(dialog.getByText("R$ 5.100,00", { exact: true })).toBeVisible();

      await dialog.getByRole("checkbox", { name: /categorias atuais serão substituídas/i }).check();
      await expect(confirm).toBeEnabled();
      await confirm.click();

      await expect(page.getByRole("dialog")).toHaveCount(0);

      const overview = await page.request.get(`/api/budgets/${project.id}`);
      expect(overview.ok()).toBeTruthy();
      const data = (await overview.json()).data;
      expect(data.totalBudgeted).toBe(510_000);
      expect(data.byCategory).toEqual([
        { name: "Equipe", budgeted: 330_000, spent: 0, pct: 0 },
        { name: "Pós-produção", budgeted: 180_000, spent: 0, pct: 0 },
      ]);

      await page.goto(`/project/${project.id}/budget`);
      await page.waitForLoadState("networkidle");

      const main = page.locator("#main-content");
      await expect(cardValue(page, "Orçado")).toHaveText("R$ 5.100,00");
      await expect(main.getByText("R$ 0,00 / R$ 3.300,00")).toBeVisible();
      await expect(main.getByText("R$ 0,00 / R$ 1.800,00")).toBeVisible();
      // Substituição, não junção: a categoria antiga desaparece do baseline.
      await expect(main.getByText("Locação", { exact: true })).toHaveCount(0);
    } finally {
      await cleanupTestData(page, { projects: project ? [project] : [], clients: [client] });
    }
  });
});
