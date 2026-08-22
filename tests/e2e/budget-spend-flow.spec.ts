import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./support/auth";
import {
  cleanupTestData,
  createClientViaApi,
  createProjectViaApi,
  type TestProject,
} from "./support/factories";
import { isMobileProject } from "./support/mobile";

function cardValue(page: Page, label: string) {
  return page
    .locator("#main-content")
    .getByText(label, { exact: true })
    .locator("xpath=following-sibling::p[1]");
}

test.describe("@budget-spend lançamento de gasto", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(isMobileProject(), "fluxo de dados roda uma vez no desktop");
    await loginAsAdmin(page);
  });

  test("persiste gasto, atualiza os totais e mantém o extrato após recarregar", async ({ page }) => {
    const client = await createClientViaApi(page);
    let project: TestProject | null = null;

    try {
      project = await createProjectViaApi(page, client.id);
      const baseline = await page.request.put(`/api/budgets/${project.id}`, {
        data: {
          totalAmount: 100_000,
          currency: "BRL",
          categories: [{ name: "Equipe", budgeted: 100_000 }],
        },
      });
      expect(baseline.ok()).toBeTruthy();

      await page.goto(`/project/${project.id}/budget`);
      await expect(page.getByRole("button", { name: "Lançar gasto" })).toBeVisible();
      await page.getByRole("button", { name: "Lançar gasto" }).click();

      const dialog = page.getByRole("dialog");
      await dialog.getByPlaceholder("Ex: Equipe").fill("Equipe");
      await dialog.getByPlaceholder("Ex: Diária cinegrafista").fill("Diária de câmera");
      await dialog.getByPlaceholder("0,00").fill("125,50");
      await dialog.locator('input[type="date"]').fill("2026-08-17");
      await dialog.getByRole("button", { name: "Lançar gasto" }).click();

      await expect(page.getByText("Gasto lançado", { exact: true })).toBeVisible();
      await expect(cardValue(page, "Realizado")).toHaveText("R$ 125,50");
      await expect(cardValue(page, "Saldo")).toHaveText("R$ 874,50");
      await expect(page.getByText("Diária de câmera", { exact: true })).toBeVisible();

      await page.reload();
      await expect(cardValue(page, "Realizado")).toHaveText("R$ 125,50");
      await expect(page.getByText("Diária de câmera", { exact: true })).toBeVisible();

      const overview = await page.request.get(`/api/budgets/${project.id}`);
      expect(overview.ok()).toBeTruthy();
      expect((await overview.json()).data).toMatchObject({
        totalSpent: 12_550,
        entries: [expect.objectContaining({ description: "Diária de câmera", amount: 12_550 })],
      });
    } finally {
      await cleanupTestData(page, { projects: project ? [project] : [], clients: [client] });
    }
  });
});
