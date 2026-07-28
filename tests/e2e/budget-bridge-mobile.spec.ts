import { expect, test } from "@playwright/test";
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
 * Ponte Orçamento IA → módulo de Orçamento (ADR-013) no viewport de celular.
 *
 * A UI só aparece quando a geração da ferramenta 04 traz o bloco
 * `cena.budget.v1`, então o teste semeia o output via `POST /api/projects/:id/state`
 * em vez de gastar uma chamada de IA (o bloco é persistido no output, é isso que
 * o ADR chama de "funciona a partir do histórico").
 */

const SEEDED_OUTPUT = [
  "ORCAMENTO AUDIOVISUAL",
  "Estimativa em faixa — valide com 2-3 orcamentos reais.",
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
    assumptions: "1 diária de 10h em BH, equipe de 3",
  }),
  "CENA_BUDGET_JSON>>>",
].join("\n");

test.describe("@budget-bridge ponte de orçamento no mobile", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!isMobileProject(), "verificação mobile-only");
    attachConsoleErrors(page, testInfo);
    await loginAsAdmin(page);
  });

  test("@budget-bridge botão e diálogo de confirmação cabem no viewport de celular", async ({
    page,
  }) => {
    const client = await createClientViaApi(page);
    let project: TestProject | null = null;

    try {
      project = await createProjectViaApi(page, client.id);

      const seed = await page.request.post(`/api/projects/${project.id}/state`, {
        data: { toolId: "04", formData: { projeto: "Teste ponte" }, outputData: SEEDED_OUTPUT },
      });
      expect(seed.ok()).toBeTruthy();

      await page.goto(`/project/${project.id}/studio/orcamento`);
      await page.waitForLoadState("networkidle");

      const trigger = page.getByRole("button", {
        name: /Usar este orçamento no módulo de Orçamento/i,
      });
      await trigger.scrollIntoViewIfNeeded();
      await expect(trigger).toBeVisible();

      // Alvo de toque >= 44px e sem overflow horizontal na página.
      const triggerBox = await trigger.boundingBox();
      expect(triggerBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      await trigger.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toBeInViewport();

      // Teto pré-selecionado (ADR-013) e total = 5500 + 3600.
      await expect(page.getByRole("radio", { name: /Teto da faixa/i })).toBeChecked();
      await expect(page.getByRole("radio", { name: /Piso da faixa/i })).not.toBeChecked();
      await expect(dialog.getByText("R$ 9.100,00", { exact: true })).toBeVisible();
      await expect(dialog.getByText(/Não entra no orçamento/i)).toBeVisible();

      const confirm = page.getByRole("button", { name: /Confirmar e enviar/i });
      await confirm.scrollIntoViewIfNeeded();
      const confirmBox = await confirm.boundingBox();
      expect(confirmBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      // Sem overflow horizontal com o diálogo aberto.
      const dialogOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(dialogOverflow).toBeLessThanOrEqual(1);
    } finally {
      await cleanupTestData(page, {
        projects: project ? [project] : [],
        clients: [client],
      });
    }
  });
});
