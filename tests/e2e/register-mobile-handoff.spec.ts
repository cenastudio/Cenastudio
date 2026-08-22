import { expect, test } from "@playwright/test";

test.describe("mobile register handoff", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("language", "pt");
    });
  });

  test("shows a branded landing handoff and blocks weak passwords client-side", async ({ page }) => {
    let registerRequests = 0;
    await page.route("**/api/auth/register", async (route) => {
      registerRequests += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Register request should not be sent for weak passwords." }),
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/register");

    await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
    await expect(page.getByText("Crie a conta e siga para o primeiro job.")).toBeVisible();
    await expect(page.getByText("Primeiro job", { exact: true })).toBeVisible();
    await expect(page.getByText("Até 128 caracteres")).toBeVisible();
    await expect(page.getByRole("button", { name: "Voltar ao início" })).toHaveCount(1);

    await page.getByLabel("Nome completo").fill("Clara Souza");
    await page.getByRole("textbox", { name: /^e-?mail$/i }).fill("clara@example.com");
    await page.getByRole("textbox", { name: "Senha", exact: true }).fill("curta");
    await page.getByRole("textbox", { name: "Confirmar senha" }).fill("curta");
    await page.getByRole("button", { name: "Criar conta e começar" }).click();

    await expect(page.getByText("Crie uma senha que cumpra todos os requisitos.")).toBeVisible();
    expect(registerRequests).toBe(0);
  });
});
