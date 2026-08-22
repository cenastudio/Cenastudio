import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./support/auth";
import {
  cleanupTestData,
  createClientViaApi,
  createProjectViaApi,
  type TestClient,
  type TestProject,
} from "./support/factories";
import { isMobileProject } from "./support/mobile";
import { assertMinTouchTargets } from "./support/touchTarget";

const PORTAL_PASSWORD = "Portal123!";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth, `horizontal overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(
    overflow.width + 2,
  );
}

async function createPortalAccess(page: Page, client: TestClient, email: string) {
  const response = await page.request.post(`/api/clients/${client.id}/portal-access`, {
    data: { email, password: PORTAL_PASSWORD },
  });
  expect(response.ok(), `portal access failed: ${response.status()} ${await response.text()}`).toBeTruthy();
}

async function seedBudget(page: Page, project: TestProject) {
  const response = await page.request.put(`/api/budgets/${project.id}`, {
    data: {
      totalAmount: 480_000,
      currency: "BRL",
      categories: [
        { name: "Direção", budgeted: 180_000 },
        { name: "Captação", budgeted: 180_000 },
        { name: "Pós-produção", budgeted: 120_000 },
      ],
    },
  });
  expect(response.ok(), `budget seed failed: ${response.status()} ${await response.text()}`).toBeTruthy();
}

async function createSentProposalFromBudget(page: Page, client: TestClient, project: TestProject) {
  const title = `Proposta ${project.name}`;
  const response = await page.request.post("/api/clients/proposals", {
    data: {
      clientId: Number(client.id),
      title,
      total: 480_000,
      html: `
        <main>
          <h1>${title}</h1>
          <p>Escopo aprovado para ${client.company}: direção, captação e pós-produção.</p>
          <strong>Total: R$ 4.800,00</strong>
        </main>
      `,
    },
  });
  expect(response.ok(), `proposal create failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  const proposal = (await response.json()).data;

  const visibility = await page.request.patch(`/api/clients/proposals/${proposal.id}/portal-visibility`, {
    data: { visible: true },
  });
  expect(visibility.ok(), `proposal portal visibility failed: ${visibility.status()} ${await visibility.text()}`).toBeTruthy();

  return {
    id: Number(proposal.id),
    title,
    shareToken: String(proposal.share_token),
  };
}

test.describe("Client -> Project -> Budget -> Proposal -> Portal", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(isMobileProject() ? { width: 390, height: 844 } : { width: 1280, height: 900 });
    await loginAsAdmin(page);
  });

  test("creates a budget-backed proposal, accepts it publicly, and shows it in the client portal", async ({ page }) => {
    test.setTimeout(90_000);

    const suffix = `${Date.now()}-${test.info().project.name}`;
    const client = await createClientViaApi(page, {
      name: `Clara Portal ${suffix}`,
      company: `Cena Cliente ${suffix}`,
      email: `cliente-${suffix}@example.com`,
      status: "active",
    });
    let project: TestProject | null = null;

    try {
      project = await createProjectViaApi(page, client.id, {
        name: `Filme Portal ${suffix}`,
        description: "Fluxo E2E P1B.4.3",
      });
      await seedBudget(page, project);

      const portalEmail = `portal-${suffix}@example.com`;
      await createPortalAccess(page, client, portalEmail);
      const proposal = await createSentProposalFromBudget(page, client, project);

      await page.goto(`/proposal/${proposal.shareToken}`);
      await expect(page.getByRole("button", { name: /baixar\/visualizar pdf/i })).toBeVisible();
      await expect(page.getByText(/aceitar proposta/i).first()).toBeVisible();
      await page.getByPlaceholder(/seu nome completo/i).fill("Clara Cliente");
      await page.getByRole("button", { name: /^aceitar proposta$/i }).click();
      await expect(page.getByText(/proposta aceita/i).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.goto("/portal/login");
      await page.locator("#portal-email").fill(portalEmail);
      await page.locator("#portal-password").fill(PORTAL_PASSWORD);
      await page.getByRole("button", { name: /^entrar$/i }).click();
      await expect(page).toHaveURL(/\/portal\/dashboard/);
      await expect(page.getByText(client.name).first()).toBeVisible();

      await page.goto("/portal/proposals");
      await expect(page.getByRole("heading", { name: /propostas e valores/i })).toBeVisible();
      await expect(page.getByText(proposal.title).first()).toBeVisible();
      await expect(page.getByText(/aceita/i).first()).toBeVisible();
      await expect(page.getByText("R$ 4.800,00").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await assertMinTouchTargets(page, { onlyWithinSelector: "header" });
    } finally {
      await cleanupTestData(page, { projects: project ? [project] : [], clients: [client] });
    }
  });
});
