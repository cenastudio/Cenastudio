/**
 * Test: A2.3 - Visual documentation of CommercialNav with overflow menu
 *
 * Takes screenshots to document the new overflow menu behavior.
 */

import { test } from "@playwright/test";
import { loginAsAdmin } from "./support/auth";

test.describe("CommercialNav - Screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Screenshot - Desktop (1280px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");

    // Wait a bit for animations
    await page.waitForTimeout(500);

    await page.screenshot({
      path: '.kiro/specs/auditoria-ux-2026-07/screenshots/commercial-nav-desktop-1280px.png',
      fullPage: false,
    });
  });

  test("Screenshot - Desktop with dropdown open (1280px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");

    // Click "Mais" button to open dropdown
    const nav = page.locator('nav[aria-label*="comercial"], nav[aria-label*="Commercial"]').first();
    const desktopNav = nav.locator('.hidden.sm\\:flex').first();
    const maisButton = desktopNav.getByRole('button', { name: /mais|more/i });
    await maisButton.click();

    // Wait for dropdown animation
    await page.waitForTimeout(300);

    await page.screenshot({
      path: '.kiro/specs/auditoria-ux-2026-07/screenshots/commercial-nav-desktop-1280px-dropdown.png',
      fullPage: false,
    });
  });

  test("Screenshot - Mobile (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");

    // Wait a bit for animations
    await page.waitForTimeout(500);

    await page.screenshot({
      path: '.kiro/specs/auditoria-ux-2026-07/screenshots/commercial-nav-mobile-375px.png',
      fullPage: false,
    });
  });

  test("Screenshot - Mobile with dropdown open (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");

    // Click to open mobile dropdown
    const nav = page.locator('nav[aria-label*="comercial"], nav[aria-label*="Commercial"]').first();
    const mobileNav = nav.locator('.sm\\:hidden').first();
    const dropdownTrigger = mobileNav.locator('button[aria-expanded]').first();
    await dropdownTrigger.click();

    // Wait for dropdown animation
    await page.waitForTimeout(300);

    await page.screenshot({
      path: '.kiro/specs/auditoria-ux-2026-07/screenshots/commercial-nav-mobile-375px-dropdown.png',
      fullPage: false,
    });
  });

  test("Screenshot - Tablet (768px)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/commercial");
    await page.waitForLoadState("networkidle");

    // Wait a bit for animations
    await page.waitForTimeout(500);

    await page.screenshot({
      path: '.kiro/specs/auditoria-ux-2026-07/screenshots/commercial-nav-tablet-768px.png',
      fullPage: false,
    });
  });
});
