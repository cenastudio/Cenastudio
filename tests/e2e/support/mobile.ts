import { test, type Page } from "@playwright/test";

/**
 * Retorna true se o teste está rodando no projeto Playwright de mobile.
 * O projeto se chama "chromium-mobile" (ver playwright.config.ts).
 */
export function isMobileProject(): boolean {
  return test.info().project.name.includes("mobile");
}

/**
 * Tenta abrir o menu mobile do app. Retorna true se conseguiu abrir,
 * false se nenhum trigger conhecido foi encontrado.
 *
 * Ordem de tentativa:
 * 1. [data-testid="mobile-nav-trigger"] (preferido — permite override explícito)
 * 2. [aria-label*="menu" i]:not([disabled]) (padrão de acessibilidade)
 * 3. button[aria-controls*="nav"] (padrão ARIA)
 */
export async function openMobileNavIfPresent(page: Page): Promise<boolean> {
  const selectors = [
    '[data-testid="mobile-nav-trigger"]',
    '[aria-label*="menu" i]:not([disabled])',
    'button[aria-controls*="nav"]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count();
    if (count > 0 && (await locator.isVisible())) {
      await locator.click();
      return true;
    }
  }

  return false;
}

/**
 * Faz scroll horizontal até que a aba de nome especificado fique visível.
 * Usado quando barra de abas mobile tem overflow-x-auto.
 */
export async function scrollTabIntoView(
  page: Page,
  tabName: string | RegExp,
): Promise<void> {
  await page.locator('[role="tab"]', { hasText: tabName }).scrollIntoViewIfNeeded();
}
