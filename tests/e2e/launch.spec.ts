import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { attachConsoleErrors } from "./support/console";
import { loginAsAdmin } from "./support/auth";
import {
  cleanupTestData,
  createClientViaApi,
  createProjectViaApi,
} from "./support/factories";

const screenshotDir = path.join(process.cwd(), "test-results", "launch-qa");

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth, `horizontal overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(
    overflow.width + 2,
  );
}

async function screenshot(page: Page, name: string) {
  // Screenshot é evidência visual auxiliar, não a asserção do teste — sob
  // execução paralela pesada, o wait interno por fontes pode ocasionalmente
  // exceder o timeout global. Falhar o teste por isso mascararia o que de
  // fato importa (o `expect` de layout que já rodou antes desta chamada).
  try {
    await page.screenshot({
      path: path.join(screenshotDir, `${test.info().project.name}-${name}.png`),
      fullPage: true,
      timeout: 10_000,
    });
  } catch (err) {
    console.warn(`[screenshot] falhou ao capturar "${name}": ${err instanceof Error ? err.message : String(err)}`);
  }
}

test.beforeEach(async ({ page }, testInfo) => {
  attachConsoleErrors(page, testInfo);
});

test("critical authenticated app screens render without layout breaks", async ({ page }) => {
  // Percorre 5 rotas sequenciais contra o Postgres real (não local) — sob
  // execução paralela com outros specs competindo pela mesma conexão, o
  // orçamento padrão de 45s fica apertado (achado documentado em
  // auditoria UX/mobile). O teste em si não valida velocidade, só layout.
  test.setTimeout(90_000);

  await loginAsAdmin(page);

  const routes = [
    ["/dashboard", /Central da Operação|Operations Center/i, "dashboard"],
    ["/admin", /Administração|Administration/i, "admin"],
    ["/admin/gerenciar", /Administração|Administration/i, "admin-users"],
    ["/proposals", /Propostas|Proposals/i, "proposals"],
    ["/documents", /Documentos|Documents/i, "documents"],
  ] as const;

  for (const [route, marker, name] of routes) {
    await page.goto(route);
    await expect(page.getByText(marker).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await screenshot(page, name);
  }
});

test("light theme project dialog keeps readable light inputs", async ({ page }) => {
  await loginAsAdmin(page);
  const suffix = Date.now();
  const client = await createClientViaApi(page, {
    name: `Cliente Dialog ${suffix}`,
    company: `Marca Dialog ${suffix}`,
  });

  try {
    // A aba de preferências é um select no mobile e botões no desktop. O
    // controle de modo visual tem rótulo estável, então o mesmo fluxo cobre
    // os dois viewports sem depender do menu de avatar.
    await page.goto("/profile");
    const mobileProfileTabs = page.locator("#profile-mobile-tabs");
    if ((page.viewportSize()?.width ?? 1024) < 768) {
      await expect(mobileProfileTabs).toBeVisible();
      await mobileProfileTabs.selectOption("preferences");
    } else {
      await page.getByRole("button", { name: /preferências|preferences/i }).click();
    }

    const themeMode = page.getByText(/^Modo de Tema$|^Theme Mode$/i).last().locator("..");
    await expect(themeMode).toBeVisible();
    const [themeResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/auth/visual-preferences") && response.request().method() === "PUT"),
      themeMode.getByRole("button", { name: /claro|light/i }).click(),
    ]);
    expect(themeResponse.ok()).toBe(true);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute("data-theme")))
      .toBe("light");

    await page.goto("/dashboard");
    await expect(page.getByText(/Central da Operação|Operations Center/i).first()).toBeVisible();

    await page.getByRole("button", { name: /novo projeto|new project/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText(/criar novo projeto|create/i).first()).toBeVisible();

    const fieldColors = await page.getByRole("dialog").locator("input, textarea, select").evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = window.getComputedStyle(node);
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
        };
      }),
    );

    expect(fieldColors.length).toBeGreaterThan(0);
    for (const color of fieldColors) {
      expect(color.backgroundColor).not.toBe("rgb(17, 17, 17)");
      expect(color.backgroundColor).not.toBe("rgb(0, 0, 0)");
      expect(color.color).not.toBe("rgb(255, 255, 255)");
    }

    await expectNoHorizontalOverflow(page);
    await screenshot(page, "light-project-dialog");
  } finally {
    await cleanupTestData(page, { clients: [client] });
  }
});

test("client, project and studio workflow stay connected", async ({ page }) => {
  await loginAsAdmin(page);
  const suffix = Date.now();

  const client = await createClientViaApi(page, {
    name: `Cliente Fluxo ${suffix}`,
    company: `Marca Fluxo ${suffix}`,
    segment: "brand",
    tax_id: "11378117000120",
    address: "Rua do Set, 100",
    city: "São Paulo",
    state: "SP",
  });

  const project = await createProjectViaApi(page, client.id, {
    name: `Projeto Fluxo ${suffix}`,
    metadataJson: JSON.stringify({ workflowFocus: "briefing" }),
  });

  try {
    await page.goto(`/project/${project.id}/studio/briefing`);

    const desktopTools = page.locator(".studio-sidebar .studio-tool-nav");
    const compactStudio = (page.viewportSize()?.width ?? 1024) < 1024;
    if (!compactStudio) {
      await expect(desktopTools.first()).toBeVisible();
      const workflowLabels = await desktopTools.evaluateAll((nodes) =>
        nodes.slice(0, 9).map((node) => node.getAttribute("aria-label")?.replace(/\s+/g, " ").trim()),
      );
      expect(workflowLabels).toEqual([
        "1 Briefing Inteligente",
        "2 Orçamento Automático",
        "3 Proposta Comercial",
        "4 Contratos",
        "1 Gerador de Roteiro",
        "2 Decupagem Técnica",
        "3 Callsheet Inteligente",
        "4 Cronograma",
        "5 Checklist de Set",
      ]);
    } else {
      const categorySelect = page.getByLabel(/categoria de ferramenta|tool category/i);
      const toolSelect = page.getByLabel(/ferramenta ativa|active tool/i);
      const sidebarToggle = page.getByTitle(/mostrar ferramentas|esconder ferramentas|show tools|hide tools/i);
      await expect(sidebarToggle).toBeVisible();
      if ((await sidebarToggle.getAttribute("title"))?.match(/mostrar|show/i)) {
        await sidebarToggle.click();
      }
      await expect(categorySelect).toBeVisible();
      await expect(toolSelect).toBeVisible();
      await expect(toolSelect.locator("option").first()).toContainText(/briefing inteligente/i);
    }

    await expect(page.locator(`input[value="${client.company}"]`)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await screenshot(page, "connected-client-workflow");
  } finally {
    await cleanupTestData(page, { projects: [project], clients: [client] });
  }
});
