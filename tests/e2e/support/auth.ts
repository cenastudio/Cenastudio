import { expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@cenastudio.com.br";
const ADMIN_PASSWORD = "admin123";

const AUTHENTICATED_ROUTE_PATTERN = /\/(admin|dashboard|clients|proposals|project|documents)/;

/**
 * Desabilita o modal de onboarding "Olá, Admin!" via localStorage.
 *
 * O modal é controlado por `Dashboard.tsx` linhas 129-134: se
 * `cena-studio-welcome-dismissed` ou `cena-studio-welcome-completed` estiver
 * setado no localStorage, o modal não aparece. O modal em si tem
 * `position: fixed; inset: 0; z-index: 9999` — sem esse contorno, ele
 * intercepta todos os cliques da página em mobile por ~500ms após o login.
 *
 * Chamamos `addInitScript` antes de qualquer navegação, garantindo que o
 * flag esteja disponível já no primeiro paint do dashboard.
 */
export async function disableOnboarding(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("cena-studio-welcome-dismissed", "true");
    } catch {
      /* localStorage indisponível (ex.: contexto file://) — segue silente */
    }
  });
}

/**
 * Executa login como admin de forma idempotente.
 *
 * - Se a página já estiver em uma rota autenticada (ex: /admin, /dashboard),
 *   apenas garante que terminamos em /admin e retorna sem repetir o login.
 * - Caso contrário, executa o fluxo completo: /login -> preencher credenciais
 *   -> submeter -> aguardar redirect para /admin.
 *
 * Property 7 (Idempotência): loginAsAdmin(page); loginAsAdmin(page); deve
 * terminar no mesmo estado que uma única chamada.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  // Deve rodar antes de qualquer navegação para valer no primeiro paint.
  await disableOnboarding(page);
  await expect
    .poll(async () => {
      const response = await page.request.get("/api/ready");
      return response.ok();
    }, { timeout: 20_000 })
    .toBe(true);

  const currentUrl = page.url();
  const alreadyAuthenticated =
    !currentUrl.includes("/login") && AUTHENTICATED_ROUTE_PATTERN.test(currentUrl);

  if (alreadyAuthenticated) {
    if (!currentUrl.includes("/admin")) {
      await page.goto("/admin");
    }
    await expect(page).toHaveURL(/\/admin/);
    return;
  }

  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /entrar no estúdio|enter studio/i }).click();
  await expect(page).toHaveURL(/\/admin/);
}

/**
 * Verifica que a página está em uma rota autenticada.
 * Útil como pós-condição em testes.
 */
export async function expectLoggedIn(page: Page): Promise<void> {
  await expect(page).toHaveURL(AUTHENTICATED_ROUTE_PATTERN);
}
