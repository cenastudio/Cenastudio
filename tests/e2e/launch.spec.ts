import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

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
  await page.screenshot({ path: path.join(screenshotDir, `${test.info().project.name}-${name}.png`), fullPage: true });
}

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.locator('input[type="email"]').fill("admin@cenastudio.com.br");
  await page.locator('input[type="password"]').fill("admin123");
  await page.getByRole("button", { name: /entrar no estúdio|enter studio/i }).click();
  await expect(page).toHaveURL(/\/admin/);
}

test.beforeEach(async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  test.info().attach("console-errors", {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify(consoleErrors, null, 2)),
  });
});

test("critical authenticated app screens render without layout breaks", async ({ page }) => {
  await loginAsAdmin(page);

  const routes = [
    ["/dashboard", /Central da Operação|Operations Center/i, "dashboard"],
    ["/admin", /Gerenciar acessos|Manage access/i, "admin"],
    ["/admin/gerenciar", /Gerenciar usuários|Manage users/i, "admin-users"],
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
  const clientResponse = await page.request.post("/api/clients", {
    data: {
      name: `Cliente Dialog ${suffix}`,
      company: `Marca Dialog ${suffix}`,
      status: "active",
    },
  });
  expect(clientResponse.ok()).toBeTruthy();
  const clientPayload = await clientResponse.json();

  await page.goto("/dashboard");
  await expect(page.getByText(/Central da Operação|Operations Center/i).first()).toBeVisible();

  try {
    const lightToggle = page.getByTitle(/modo claro|light mode/i);
    if (await lightToggle.count()) await lightToggle.first().click();

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
    await page.request.delete(`/api/clients/${clientPayload.data.id}`);
  }
});

test("client, project and studio workflow stay connected", async ({ page }) => {
  test.skip(test.info().project.name.includes("mobile"), "Desktop sidebar workflow assertion");
  await loginAsAdmin(page);
  const suffix = Date.now();

  const clientResponse = await page.request.post("/api/clients", {
    data: {
      name: `Cliente Fluxo ${suffix}`,
      company: `Marca Fluxo ${suffix}`,
      status: "active",
      segment: "brand",
      tax_id: "11378117000120",
      address: "Rua do Set, 100",
      city: "São Paulo",
      state: "SP",
    },
  });
  expect(clientResponse.ok()).toBeTruthy();
  const clientPayload = await clientResponse.json();

  const projectResponse = await page.request.post("/api/projects", {
    data: {
      name: `Projeto Fluxo ${suffix}`,
      clientId: clientPayload.data.id,
      metadataJson: JSON.stringify({ workflowFocus: "briefing" }),
    },
  });
  expect(projectResponse.ok()).toBeTruthy();
  const projectPayload = await projectResponse.json();

  try {
    await page.goto(`/project/${projectPayload.data.id}/studio/briefing`);
    await expect(page.getByText("Comercial primeiro")).toBeVisible();
    await expect(page.getByText("Pré-produção")).toBeVisible();

    const workflowLabels = await page.locator(".studio-sidebar .studio-tool-nav").evaluateAll((nodes) =>
      nodes.slice(0, 9).map((node) => node.textContent?.replace(/^(\d)(\S)/, "$1 $2").replace(/\s+/g, " ").trim()),
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

    await expect(page.locator(`input[value="Marca Fluxo ${suffix}"]`)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await screenshot(page, "connected-client-workflow");
  } finally {
    await page.request.delete(`/api/projects/${projectPayload.data.id}`);
    await page.request.delete(`/api/clients/${clientPayload.data.id}`);
  }
});
