import { expect, test } from "@playwright/test";
import { attachConsoleErrors } from "./support/console";
import { loginAsAdmin } from "./support/auth";
import {
  cleanupTestData,
  createClientViaApi,
  createProjectViaApi,
  type TestProject,
} from "./support/factories";
import {
  isMobileProject,
  openMobileNavIfPresent,
  scrollTabIntoView,
} from "./support/mobile";
import { assertMinTouchTargets } from "./support/touchTarget";

/**
 * Fase 1 — Testes de páginas críticas no viewport mobile.
 *
 * Cobertura de requirements:
 *   - Req 2.1, 2.2, 2.3, 2.4: comportamento observável em páginas críticas
 *     (navegação, troca de abas, ações primárias).
 *   - Req 3.1, 3.4, 3.5: alvos de toque mínimos (44x44).
 *
 * Properties (design.md):
 *   - Property 1: Login idempotente (via loginAsAdmin em beforeEach).
 *   - Property 2: Cada teste é independente — cleanup no `finally`.
 *   - Property 3: Falhas de cleanup não mascaram falha do teste.
 *   - Property 6: Erros de console são anexados, não fazem o teste falhar.
 *
 * Convenção "Opção A" do design.md:
 *   - `assertMinTouchTargets` pode falhar aqui — a intenção é observar a
 *     realidade do app. Falhas viram entradas em FASE_1_ACHADOS.md (Task 10).
 *   - `throw new Error("...Fase 2 precisa...")` sinaliza que a estrutura da
 *     página divergiu do esperado (ex.: menos de 2 abas onde deveríamos ter
 *     abas). Isso não é bug: é escopo para a próxima fase.
 */
test.describe("@fase1 critical pages on mobile", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // `test.info()` só é válido dentro de hooks/tests — chamar
    // `isMobileProject()` fora daqui lança em tempo de parse.
    test.skip(!isMobileProject(), "Fase 1 mobile-only");
    attachConsoleErrors(page, testInfo);
    await loginAsAdmin(page);
  });

  // ================================================================
  // TESTE 1: /dashboard — carrega e navegação principal responde
  // ================================================================
  test("@fase1 dashboard: carrega e navegação principal responde", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByText(/Central da Operação|Operations Center/i).first(),
    ).toBeVisible();

    // Comportamento: tentar abrir menu mobile e navegar via link.
    const menuOpened = await openMobileNavIfPresent(page);

    if (menuOpened) {
      const commercialLink = page
        .getByRole("link", { name: /comercial|commercial/i })
        .first();
      if (
        (await commercialLink.count()) > 0 &&
        (await commercialLink.isVisible())
      ) {
        await commercialLink.click();
        await expect(page).toHaveURL(
          /\/(commercial|clients|pipeline|proposals)/,
        );
        await page.goBack();
      }
    } else {
      // Fallback: valida apenas que existe elemento interativo na main.
      const firstInteractiveCard = page.locator("main a, main button").first();
      if (
        (await firstInteractiveCard.count()) > 0 &&
        (await firstInteractiveCard.isVisible())
      ) {
        await expect(firstInteractiveCard).toBeEnabled();
      }
    }

    await assertMinTouchTargets(page);
  });

  // ================================================================
  // TESTE 2: /commercial — troca entre subrotas
  // ================================================================
  test("@fase1 commercial: troca entre subrotas (clients, pipeline, proposals)", async ({
    page,
  }) => {
    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");

    // Clients — sem marcador estável, valida somente URL.
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/clients/);

    // Pipeline — sem marcador estável, valida somente URL.
    await page.goto("/pipeline");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/pipeline/);

    // Proposals — usa o marcador conhecido do launch.spec.ts.
    await page.goto("/proposals");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(/Propostas|Proposals/i).first(),
    ).toBeVisible();

    await assertMinTouchTargets(page);
  });

  // ================================================================
  // TESTE 3: /clients/:id — troca de abas mostra conteúdo no viewport
  // ================================================================
  test("@fase1 client detail: troca de abas mostra conteúdo no viewport", async ({
    page,
  }) => {
    const client = await createClientViaApi(page);

    try {
      await page.goto(`/clients/${client.id}`);
      await page.waitForLoadState("networkidle");

      const tabs = page.getByRole("tab");
      await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

      const tabCount = await tabs.count();
      if (tabCount < 2) {
        throw new Error(
          `Esperado >=2 abas em /clients/:id, encontrado ${tabCount} — Fase 2 precisa revisar layout`,
        );
      }

      // Primeira aba já está ativa por default. Clicar na segunda.
      const secondTab = tabs.nth(1);
      const secondTabText = (await secondTab.textContent()) ?? "";
      await scrollTabIntoView(page, secondTabText);
      await secondTab.click();

      // Painel da aba nova deve estar visível no viewport.
      const secondTabAriaControls =
        await secondTab.getAttribute("aria-controls");
      if (secondTabAriaControls) {
        const panel = page.locator(`#${secondTabAriaControls}`);
        await expect(panel).toBeVisible();
        await expect(panel).toBeInViewport();
      } else {
        const activePanel = page
          .locator('[role="tabpanel"]')
          .filter({ hasNot: page.locator("[hidden]") })
          .first();
        await expect(activePanel).toBeVisible();
        await expect(activePanel).toBeInViewport();
      }

      await assertMinTouchTargets(page);
    } finally {
      await cleanupTestData(page, { clients: [client] });
    }
  });

  // ================================================================
  // TESTE 4: /admin — troca de abas mostra conteúdo no viewport
  // ================================================================
  test("@fase1 admin dashboard: troca de abas mostra conteúdo no viewport", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(
      page.getByText(/Administração|Administration/i).first(),
    ).toBeVisible();

    const tabs = page.getByRole("tab");
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    const tabCount = await tabs.count();
    if (tabCount < 2) {
      throw new Error(
        `Esperado >=2 abas em /admin, encontrado ${tabCount} — Fase 2 precisa revisar layout`,
      );
    }

    const secondTab = tabs.nth(1);
    const secondTabText = (await secondTab.textContent()) ?? "";
    await scrollTabIntoView(page, secondTabText);
    await secondTab.click();

    const secondTabAriaControls =
      await secondTab.getAttribute("aria-controls");
    if (secondTabAriaControls) {
      const panel = page.locator(`#${secondTabAriaControls}`);
      await expect(panel).toBeVisible();
      await expect(panel).toBeInViewport();
    } else {
      const activePanel = page
        .locator('[role="tabpanel"]')
        .filter({ hasNot: page.locator("[hidden]") })
        .first();
      await expect(activePanel).toBeVisible();
      await expect(activePanel).toBeInViewport();
    }

    await assertMinTouchTargets(page);
  });

  // ================================================================
  // TESTE 5: /project/:id — carrega e ações primárias respondem
  // ================================================================
  test("@fase1 project hub: carrega e ações primárias respondem", async ({
    page,
  }) => {
    const client = await createClientViaApi(page);
    let project: TestProject | null = null;

    try {
      project = await createProjectViaApi(page, client.id);

      await page.goto(`/project/${project.id}`);
      await page.waitForLoadState("networkidle");

      // Validar que carregou algum conteúdo principal do projeto.
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible();

      // Ação primária: primeiro link/botão dentro de main.
      const primaryAction = mainContent
        .getByRole("link")
        .or(mainContent.getByRole("button"))
        .first();

      if (
        (await primaryAction.count()) > 0 &&
        (await primaryAction.isVisible())
      ) {
        await expect(primaryAction).toBeEnabled();
      }

      await assertMinTouchTargets(page);
    } finally {
      await cleanupTestData(page, {
        projects: project ? [project] : [],
        clients: [client],
      });
    }
  });
});
