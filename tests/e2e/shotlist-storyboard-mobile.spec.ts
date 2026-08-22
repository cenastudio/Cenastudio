import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { loginAsAdmin } from "./support/auth";
import {
  cleanupTestData,
  createClientViaApi,
  createProjectViaApi,
  type TestProject,
} from "./support/factories";
import { isMobileProject } from "./support/mobile";
import { assertMinTouchTargets } from "./support/touchTarget";

const screenshotPath = path.resolve("tmp/g4-shotlist-storyboard-mobile.png");

async function createShotViaApi(page: Page, projectId: string): Promise<{ id: number }> {
  const response = await page.request.post(`/api/shotlists/${projectId}/shots`, {
    data: {
      scene: "03A",
      shotType: "Close",
      description: "Clara ajusta o headset antes da primeira tomada",
      camera: "A-Cam",
      lens: "50mm",
      movement: "Static",
      durationSec: 90,
    },
  });

  if (!response.ok()) {
    throw new Error(`[shotlist-storyboard] create shot failed: HTTP ${response.status()} — ${await response.text()}`);
  }

  const json = await response.json();
  return json.data;
}

async function installStoryboardMockRoutes(page: Page) {
  const imageUrl =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='960' height='540' viewBox='0 0 960 540'%3E%3Crect width='960' height='540' fill='%230b0b0b'/%3E%3Cpath d='M120 390 C250 240 420 220 560 310 S780 390 850 190' fill='none' stroke='%23f15a24' stroke-width='14' stroke-linecap='round'/%3E%3Crect x='168' y='112' width='624' height='316' rx='18' fill='none' stroke='%23ffffff' stroke-width='8' opacity='.85'/%3E%3Ccircle cx='342' cy='270' r='62' fill='none' stroke='%23ffffff' stroke-width='8' opacity='.72'/%3E%3Cpath d='M480 334 L612 198 L724 334' fill='none' stroke='%23ffffff' stroke-width='8' stroke-linecap='round' stroke-linejoin='round' opacity='.72'/%3E%3C/svg%3E";

  const frame = {
    id: 701,
    user_id: 1,
    project_id: 1,
    shot_id: 1,
    prompt: "Plano a lápis com Clara no headset",
    final_prompt: "Plano a lápis com Clara no headset. Style: storyboard-pencil.",
    provider: "mock",
    model: "storyboard-mock",
    image_url: imageUrl,
    storage_path: null,
    status: "generated",
    error_message: null,
    revision: 1,
    approved_at: null,
    approved_by_id: null,
    created_at: "2026-08-22T12:00:00.000Z",
    updated_at: "2026-08-22T12:00:00.000Z",
  };

  await page.route("**/api/shotlists/shots/*/storyboard", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { success: true, data: [] } });
      return;
    }
    await route.continue();
  });

  await page.route("**/api/shotlists/shots/*/storyboard/generate", async (route) => {
    await route.fulfill({ status: 201, json: { success: true, data: frame } });
  });

  await page.route("**/api/shotlists/storyboard/*/approve", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          ...frame,
          status: "approved",
          approved_at: "2026-08-22T12:01:00.000Z",
          approved_by_id: 1,
        },
      },
    });
  });
}

test.describe("@g4 shot storyboard mobile", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isMobileProject(), "G4.5 mobile-only");
    await loginAsAdmin(page);
  });

  test("opens, generates and approves storyboard without mandatory horizontal scroll", async ({ page }) => {
    const client = await createClientViaApi(page, { name: "Cliente Storyboard Mobile" });
    let project: TestProject | null = null;

    try {
      project = await createProjectViaApi(page, client.id, {
        name: "Filme Storyboard Mobile",
      });
      await createShotViaApi(page, project.id);
      await installStoryboardMockRoutes(page);

      await page.goto(`/project/${project.id}/shotlist`);
      await expect(page.getByRole("heading", { name: /shot list/i })).toBeVisible();

      const storyboardButton = page.getByRole("button", { name: /storyboard/i }).first();
      await expect(storyboardButton).toBeVisible();
      await storyboardButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toBeInViewport();
      await expect(page.getByRole("heading", { name: /storyboard/i })).toBeVisible();

      await page.getByLabel(/intenção visual|visual intent/i).fill("Desenho a lápis com contraluz e câmera baixa");
      await page.getByRole("button", { name: /gerar frame|generate frame/i }).click();
      await expect(dialog.getByAltText("Plano a lápis com Clara no headset")).toBeVisible();

      await page.getByRole("button", { name: /^aprovar$|^approve$/i }).click();
      await expect(dialog.getByText(/aprovado|approved/i).first()).toBeVisible();

      const overflowReport = await page.evaluate(() => {
        const roots = Array.from(document.querySelectorAll<HTMLElement>('main, [role="dialog"]'));
        const horizontalOverflow = Math.max(...roots.map((root) => root.scrollWidth - root.clientWidth), 0);
        const offenders = roots.flatMap((root) =>
          Array.from(root.querySelectorAll<HTMLElement>("*"))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const rootRect = root.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              text: (element.getAttribute("aria-label") || element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
              className: element.className.toString().slice(0, 120),
              right: Math.round(rect.right - rootRect.left),
              rootWidth: Math.round(rootRect.width),
              width: Math.round(rect.width),
            };
          })
          .filter((item) => item.width > 0 && item.right > item.rootWidth + 2),
        )
          .slice(0, 5);
        return { horizontalOverflow, offenders };
      });
      expect(
        overflowReport.horizontalOverflow,
        `Shot List/storyboard mobile should not require horizontal page scroll. Offenders: ${JSON.stringify(overflowReport.offenders)}`,
      ).toBeLessThanOrEqual(2);

      await assertMinTouchTargets(page, { onlyWithinSelector: '[role="dialog"]' });
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } finally {
      await cleanupTestData(page, {
        projects: project ? [project] : [],
        clients: [client],
      });
    }
  });
});
