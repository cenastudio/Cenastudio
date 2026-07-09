import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    // ADMIN_DEFAULT_PASSWORD forçado aqui para isolar os testes E2E do
    // valor real presente no .env local. Sem isso, o admin criado no SQLite
    // rotaciona a senha para o valor do .env, causando 401 nos testes que
    // usam a credencial documentada `admin123`.
    command: "DATABASE_URL= ADMIN_DEFAULT_PASSWORD=admin123 npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 960 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
