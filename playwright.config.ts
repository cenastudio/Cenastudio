import { defineConfig, devices } from "@playwright/test";

const e2eAppPort = 5174;
const e2eApiPort = 5002;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${e2eAppPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    // ADMIN_DEFAULT_PASSWORD forçado aqui para isolar os testes E2E do
    // valor real presente no .env local. Sem isso, o admin criado no SQLite
    // rotaciona a senha para o valor do .env, causando 401 nos testes que
    // usam a credencial documentada `admin123`.
    command: `SUPABASE_DATABASE_URL= DATABASE_URL= POSTGRES_PRISMA_URL= POSTGRES_URL= DIRECT_URL= DATABASE_PATH=/tmp/cena-e2e.db ADMIN_DEFAULT_PASSWORD=admin123 npx concurrently -k "NODE_ENV=development PORT=${e2eApiPort} npx tsx watch server/index.ts" "VITE_API_PROXY=http://127.0.0.1:${e2eApiPort} npx vite --host 127.0.0.1 --port ${e2eAppPort}"`,
    url: `http://127.0.0.1:${e2eAppPort}`,
    reuseExistingServer: false,
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
