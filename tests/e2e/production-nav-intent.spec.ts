import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsAdmin } from "./support/auth";
import { assertMinTouchTargets } from "./support/touchTarget";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(overflow.scrollWidth, `horizontal overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(
    overflow.width + 2,
  );
}

function productionNav(page: Page): Locator {
  return page.locator('nav[aria-label*="produção"], nav[aria-label*="Production"]').first();
}

async function expectProductionLoaded(page: Page) {
  const nav = productionNav(page);
  await expect(nav).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await assertMinTouchTargets(page, { onlyWithinSelector: 'nav[aria-label*="produção"], nav[aria-label*="Production"]' });
  return nav;
}

test.describe("ProductionNav intent discovery", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("390px mobile: discovers groups and returns from resources to daily work", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tools");

    const nav = await expectProductionLoaded(page);
    const mobileNav = nav.locator(".sm\\:hidden").first();
    await expect(mobileNav).toBeVisible();

    const trigger = mobileNav.locator("button[aria-expanded]").first();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const menu = mobileNav.locator(".mt-1.border").first();
    await expect(menu.getByText(/fluxo diário/i)).toBeVisible();
    await expect(menu.getByText(/recursos do job/i)).toBeVisible();
    await expect(menu.getByText(/operação/i)).toBeVisible();

    await menu.getByRole("button", { name: /documentos/i }).click();
    await expect(page).toHaveURL(/\/documents/);

    const documentsNav = await expectProductionLoaded(page);
    const documentsMobileNav = documentsNav.locator(".sm\\:hidden").first();
    await documentsMobileNav.locator("button[aria-expanded]").first().click();
    await documentsMobileNav.locator(".mt-1.border").first().getByRole("button", { name: /jobs/i }).click();

    await expect(page).toHaveURL(/\/projects/);
  });

  test("tablet: keeps daily work direct and groups secondary areas", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/tools");

    const nav = await expectProductionLoaded(page);
    const desktopNav = nav.locator(".hidden.sm\\:flex").first();
    await expect(desktopNav).toBeVisible();

    await expect(desktopNav.getByRole("button", { name: /jobs/i })).toBeVisible();
    await expect(desktopNav.getByRole("button", { name: /estúdio ia|ai studio/i })).toBeVisible();
    await expect(desktopNav.getByRole("button", { name: /aprovações|approvals/i })).toBeVisible();

    await desktopNav.getByRole("button", { name: /mais|more/i }).click();
    await expect(page.getByText(/recursos do job|job resources/i)).toBeVisible();
    await expect(page.getByText(/^operação$|^operations$/i)).toBeVisible();

    await page.getByRole("menuitem", { name: /documentos|documents/i }).click();
    await expect(page).toHaveURL(/\/documents/);

    const documentsNav = await expectProductionLoaded(page);
    await documentsNav.locator(".hidden.sm\\:flex").first().getByRole("button", { name: /jobs/i }).click();
    await expect(page).toHaveURL(/\/projects/);
  });

  test("desktop: exposes the daily flow and keeps overflow under control", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/projects");

    const nav = await expectProductionLoaded(page);
    const desktopNav = nav.locator(".hidden.sm\\:flex").first();
    await expect(desktopNav).toBeVisible();

    await desktopNav.getByRole("button", { name: /estúdio ia|ai studio/i }).click();
    await expect(page).toHaveURL(/\/tools/);

    const toolsNav = await expectProductionLoaded(page);
    await toolsNav.locator(".hidden.sm\\:flex").first().getByRole("button", { name: /aprovações|approvals/i }).click();
    await expect(page).toHaveURL(/\/video-reviews/);

    const reviewsNav = await expectProductionLoaded(page);
    await reviewsNav.locator(".hidden.sm\\:flex").first().getByRole("button", { name: /mais|more/i }).click();
    await expect(page.getByText(/recursos do job|job resources/i)).toBeVisible();
  });
});
