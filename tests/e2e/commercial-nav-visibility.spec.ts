/**
 * Test: A2.3 - Validar menu overflow "Mais" no CommercialNav
 *
 * Após implementação do menu overflow, este teste valida:
 * - Desktop: 3 abas primárias + botão "Mais" com dropdown
 * - Mobile: dropdown único com todas as 5 abas
 * - Todas as abas acessíveis em ≤2 toques
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./support/auth";

test.describe("CommercialNav - Menu overflow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Desktop (1280px): deve mostrar 3 abas primárias + botão Mais com dropdown", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");

    const nav = page.locator('nav[aria-label*="comercial"], nav[aria-label*="Commercial"]').first();
    await expect(nav).toBeVisible();

    // Desktop should show the sm:flex container
    const desktopNav = nav.locator('.hidden.sm\\:flex').first();
    await expect(desktopNav).toBeVisible();

    // Should show 3 primary tabs + 1 "Mais" button = 4 buttons total
    const visibleButtons = desktopNav.locator('button');
    const buttonCount = await visibleButtons.count();

    console.log(`Desktop: ${buttonCount} buttons visible (3 primary tabs + 1 "Mais" button)`);
    expect(buttonCount).toBe(4);

    // Check that primary tabs are present
    await expect(desktopNav.getByRole('button', { name: /visão geral|overview/i })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: /clientes|clients/i })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: /pipeline/i })).toBeVisible();

    // Check that "Mais" button exists
    const maisButton = desktopNav.getByRole('button', { name: /mais|more/i });
    await expect(maisButton).toBeVisible();

    // Click "Mais" to open dropdown
    await maisButton.click();

    // Verify secondary tabs are in dropdown
    const dropdown = page.locator('[data-slot="dropdown-menu-content"]');
    await expect(dropdown).toBeVisible();

    await expect(dropdown.getByRole('menuitem', { name: /propostas|proposals/i })).toBeVisible();
    await expect(dropdown.getByRole('menuitem', { name: /interações|interactions/i })).toBeVisible();

    console.log('✅ Desktop: 3 primary tabs + "Mais" dropdown with 2 secondary tabs confirmed');
  });

  test("Mobile (375px): deve mostrar dropdown único com todas as 5 abas", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");

    const nav = page.locator('nav[aria-label*="comercial"], nav[aria-label*="Commercial"]').first();
    await expect(nav).toBeVisible();

    // Mobile should show the sm:hidden container
    const mobileNav = nav.locator('.sm\\:hidden').first();
    await expect(mobileNav).toBeVisible();

    // Should show one button (the dropdown trigger)
    const dropdownTrigger = mobileNav.locator('button[aria-expanded]').first();
    await expect(dropdownTrigger).toBeVisible();

    // Initially dropdown should be closed
    await expect(dropdownTrigger).toHaveAttribute('aria-expanded', 'false');

    // Click to open dropdown
    await dropdownTrigger.click();
    await expect(dropdownTrigger).toHaveAttribute('aria-expanded', 'true');

    // Verify all 5 tabs are accessible in the dropdown
    const mobileDropdown = mobileNav.locator('.mt-1.border').first();
    await expect(mobileDropdown).toBeVisible();

    const allTabButtons = mobileDropdown.locator('button');
    const tabCount = await allTabButtons.count();

    console.log(`Mobile dropdown: ${tabCount} tabs available`);
    expect(tabCount).toBe(5);

    // Verify all tab labels are present
    await expect(mobileDropdown.getByRole('button', { name: /visão geral|overview/i })).toBeVisible();
    await expect(mobileDropdown.getByRole('button', { name: /clientes|clients/i })).toBeVisible();
    await expect(mobileDropdown.getByRole('button', { name: /pipeline/i })).toBeVisible();
    await expect(mobileDropdown.getByRole('button', { name: /propostas|proposals/i })).toBeVisible();
    await expect(mobileDropdown.getByRole('button', { name: /interações|interactions/i })).toBeVisible();

    console.log('✅ Mobile: All 5 tabs accessible via single dropdown');
  });

  test("Mobile: todas as seções acessíveis em ≤2 toques", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");

    const nav = page.locator('nav[aria-label*="comercial"], nav[aria-label*="Commercial"]').first();
    const mobileNav = nav.locator('.sm\\:hidden').first();
    const dropdownTrigger = mobileNav.locator('button[aria-expanded]').first();

    // Test accessing each tab: 1 touch to open dropdown + 1 touch to select tab = 2 touches
    const tabsToTest = [
      { name: /clientes|clients/i, expectedUrl: /\/clients/ },
      { name: /pipeline/i, expectedUrl: /\/pipeline/ },
      { name: /propostas|proposals/i, expectedUrl: /\/proposals/ },
      { name: /interações|interactions/i, expectedUrl: /\/interactions/ },
    ];

    for (const tab of tabsToTest) {
      // Reset to commercial page
      await page.goto("/commercial");
      await page.waitForLoadState("networkidle");

      // Touch 1: Open dropdown
      await dropdownTrigger.click();
      const mobileDropdown = mobileNav.locator('.mt-1.border').first();
      await expect(mobileDropdown).toBeVisible();

      // Touch 2: Select tab
      const tabButton = mobileDropdown.getByRole('button', { name: tab.name });
      await tabButton.click();

      // Verify navigation happened
      await expect(page).toHaveURL(tab.expectedUrl);

      console.log(`✅ Accessed "${tab.name.source}" in 2 touches`);
    }

    console.log('✅ All sections accessible in ≤2 touches on mobile');
  });

  test("Tablet (768px): deve usar layout desktop", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");

    const nav = page.locator('nav[aria-label*="comercial"], nav[aria-label*="Commercial"]').first();
    await expect(nav).toBeVisible();

    // Tablet uses desktop layout (sm:flex, which includes md and up)
    const desktopNav = nav.locator('.hidden.sm\\:flex').first();
    await expect(desktopNav).toBeVisible();

    // Should show 4 buttons (3 primary + 1 "Mais")
    const visibleButtons = desktopNav.locator('button');
    const buttonCount = await visibleButtons.count();

    expect(buttonCount).toBe(4);

    console.log('✅ Tablet: Uses desktop layout with overflow menu');
  });
});
