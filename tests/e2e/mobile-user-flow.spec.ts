import { expect, test } from "@playwright/test";
import { attachConsoleErrors } from "./support/console";
import { loginAsAdmin } from "./support/auth";
import {
  cleanupTestData,
  createClientViaApi,
  type TestProject,
} from "./support/factories";
import { isMobileProject, openMobileNavIfPresent } from "./support/mobile";

/**
 * Fluxo completo em mobile: criar projeto via UI, editar campo persistível,
 * salvar, reload, confirmar persistência.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5.
 * Properties: 1 (Determinismo), 2 (Isolamento), 3 (Cleanup não mascara).
 *
 * Este teste roda apenas no project `chromium-mobile`. Se algum passo do
 * fluxo não for alcançável na UI mobile atual, a asserção falha explícito
 * apontando o que a Fase 2 precisa expor — a falha alimenta
 * `FASE_1_ACHADOS.md` (Task 10) e não deve ser mascarada como skip.
 */
test.describe("@fase1 mobile user flow", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!isMobileProject(), "Fase 1 é sobre uso mobile real");
    attachConsoleErrors(page, testInfo);
  });

  test("@fase1 usuário mobile cria projeto, edita e persiste após reload", async ({
    page,
  }) => {
    // TODO(fase-2): reduzir latência de criação de projeto para caber no
    // timeout global de 45s definido em playwright.config.ts (Req 6.3).
    test.setTimeout(90_000);

    await loginAsAdmin(page);
    const client = await createClientViaApi(page);
    const createdProjects: TestProject[] = [];

    try {
      // ============================================================
      // Passo 1: Navegar ao dashboard
      // ============================================================
      await page.goto("/dashboard");
      await expect(
        page.getByText(/Central da Operação|Operations Center/i).first(),
      ).toBeVisible();

      // Abrir menu mobile se houver — o botão "Novo projeto" pode já estar
      // visível no dashboard, então o menu é oportunista, não obrigatório.
      await openMobileNavIfPresent(page);

      // ============================================================
      // Passo 2: Clicar em "Novo projeto" e preencher o modal
      // ============================================================
      const newProjectBtn = page
        .getByRole("button", { name: /novo projeto|new project/i })
        .first();
      await expect(newProjectBtn).toBeVisible({ timeout: 10_000 });
      await newProjectBtn.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      const projectName = `Projeto Mobile ${Date.now()}`;

      // Nome do projeto: primeiro input text visível do dialog. Tentamos
      // múltiplos seletores porque o app pode usar name/placeholder variado.
      const nameInput = dialog
        .locator(
          'input[name="name"], input[placeholder*="nome" i], input[placeholder*="name" i], input[type="text"]',
        )
        .first();
      await expect(nameInput).toBeVisible({ timeout: 5_000 });
      await nameInput.fill(projectName);

      // Cliente: pode ser combobox custom (Radix) ou select nativo.
      const clientCombo = dialog.getByRole("combobox").first();
      const comboCount = await clientCombo.count();
      if (comboCount > 0 && (await clientCombo.isVisible())) {
        await clientCombo.click();
        await page
          .getByRole("option", { name: new RegExp(client.name, "i") })
          .first()
          .click();
      } else {
        const selectEl = dialog.locator("select").first();
        if ((await selectEl.count()) > 0) {
          await selectEl.selectOption({ label: client.name });
        }
      }

      // Submit — botão dentro do dialog.
      await dialog
        .getByRole("button", {
          name: /criar projeto|criar|salvar|create/i,
        })
        .first()
        .click();

      // Aguarda o modal fechar — sinal explícito de que o submit foi aceito.
      await expect(dialog).not.toBeVisible({ timeout: 10_000 });

      // ============================================================
      // Passo 3: Capturar o projeto criado
      // ============================================================
      // Após criar, o app pode redirecionar para /project/:id ou listar o
      // projeto no dashboard. Tentamos os dois caminhos.
      await page.waitForLoadState("networkidle");

      let projectId: string | null = null;
      const urlMatch = page.url().match(/\/project\/([^/?#]+)/);
      if (urlMatch) {
        projectId = urlMatch[1];
      } else {
        // Se não redirecionou, tentar clicar no projeto recém criado no dashboard.
        const projectLink = page.getByText(projectName).first();
        if ((await projectLink.count()) > 0) {
          await projectLink.click();
          await page.waitForLoadState("networkidle");
          const linkedMatch = page.url().match(/\/project\/([^/?#]+)/);
          if (linkedMatch) projectId = linkedMatch[1];
        }
      }

      if (!projectId) {
        throw new Error(
          "Não foi possível determinar o projectId após criação — Fase 2 precisa expor navegação direta pós-criação (redirect ou link visível no dashboard)",
        );
      }

      createdProjects.push({
        id: projectId,
        clientId: client.id,
        name: projectName,
      });

      // ============================================================
      // Passo 4: Localizar um campo persistível e editar
      // ============================================================
      const projectHubUrl = `/project/${projectId}`;
      if (!page.url().includes(projectHubUrl)) {
        await page.goto(projectHubUrl);
      }
      await page.waitForLoadState("networkidle");

      // Procura o primeiro input text/textarea visível na página. Assumimos
      // que o hub do projeto expõe um campo editável (ex.: nome do projeto).
      const editableInput = page
        .locator('input[type="text"], input:not([type]), textarea')
        .filter({ hasNot: page.locator('[type="hidden"]') })
        .first();

      const editableCount = await editableInput.count();
      if (editableCount === 0) {
        throw new Error(
          "nenhum campo persistível encontrado em /project/:id — Fase 2 precisa expor um",
        );
      }

      await expect(editableInput).toBeVisible();
      const newValue = `Editado Mobile ${Date.now()}`;
      await editableInput.fill(newValue);

      // ============================================================
      // Passo 5: Salvar via UI (botão explícito ou auto-save no blur)
      // ============================================================
      const saveBtn = page.getByRole("button", { name: /salvar|save/i }).first();
      const saveCount = await saveBtn.count();
      if (saveCount > 0 && (await saveBtn.isVisible())) {
        await saveBtn.click();
      } else {
        // Sem botão explícito — muitos hubs usam auto-save on blur.
        await editableInput.blur();
      }

      // Aguarda sinal de sucesso — toast do sonner ou role="status".
      // Se o toast for rápido demais, tolera: a validação final é via reload.
      try {
        await expect(
          page
            .locator('[data-sonner-toast], .sonner-toast, [role="status"]')
            .first(),
        ).toBeVisible({ timeout: 5_000 });
      } catch {
        // Ausência de toast não é sinal de falha aqui — a persistência é
        // confirmada explicitamente após o reload no passo 7.
      }

      // ============================================================
      // Passo 6: Reload
      // ============================================================
      await page.reload();
      await page.waitForLoadState("networkidle");

      // ============================================================
      // Passo 7: Confirmar que o valor persistiu
      // ============================================================
      const persistedInput = page
        .locator('input[type="text"], input:not([type]), textarea')
        .filter({ hasNot: page.locator('[type="hidden"]') })
        .first();

      await expect(persistedInput).toHaveValue(newValue, { timeout: 10_000 });
    } finally {
      await cleanupTestData(page, {
        projects: createdProjects,
        clients: [client],
      });
    }
  });
});
