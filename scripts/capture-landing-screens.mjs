import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.LANDING_CAPTURE_BASE_URL || "http://127.0.0.1:5173";
const adminEmail = process.env.LANDING_CAPTURE_EMAIL || "admin@cenastudio.com.br";
const adminPassword = process.env.LANDING_CAPTURE_PASSWORD || "admin123";
const outputDir = path.join(process.cwd(), "client", "public", "landing", "product");
const socialOutputDir = path.join(process.cwd(), "client", "public", "landing", "social");

// The local account is only a capture fixture. The visible identity stays
// plausible without representing a real customer or production workspace.
const demoUser = {
  name: "Clara Mendes",
  studioName: "Lume Filmes",
  studioRole: "Diretora de producao",
};
const demoClient = {
  name: "Brisa Norte",
  email: "producao@brisanorte.example",
};
const demoProjectName = "Colecao Horizonte 2026";
const metadata = {
  projectType: "Campanha audiovisual",
  deadline: "2026-08-15",
  objective:
    "Lançar uma campanha vertical e horizontal para uma marca de lifestyle, com narrativa premium, calendário de aprovação e entregáveis por canal.",
  creativeGoals: {
    format: "Hero film 60s + Reels 9:16 + cortes para tráfego pago",
    client: demoClient.name,
    tone: "Natural, sofisticado, documental e comercial",
    budget: "R$ 48.000",
  },
};

const toolStates = [
  {
    toolId: "07",
    formData: {
      cliente: demoClient.name,
      objetivo: metadata.objective,
      publico: "Pessoas 24-38 interessadas em design, cultura e lifestyle.",
      canais: "Instagram, TikTok, landing page e mídia paga.",
    },
    outputData:
      "Briefing aprovado: campanha de lançamento Verão 2026 com foco em desejo, textura, movimento e prova de produto. Entregáveis: filme hero, 6 reels, stills de apoio e variações de CTA.",
  },
  {
    toolId: "briefing",
    formData: { etapa: "Briefing aprovado" },
    outputData: "Briefing aprovado e pronto para pré-produção.",
  },
  {
    toolId: "01",
    formData: {
      title: "Brisa Norte: Horizonte 2026",
      format: "Hero film 60s + Reels 9:16",
      duration: "60 segundos",
      genre: "Comercial lifestyle premium",
      synopsis:
        "Uma pessoa atravessa a manhã entre arquitetura clara, vento e paisagem costeira. A coleção aparece em movimento real, textura e detalhe, conectando desejo, liberdade e acabamento.",
      characters:
        "Modelo principal 28 anos, direção natural e elegante. Figurantes em cenas de lifestyle ao fundo, sem roubar foco da peça.",
      locations: "Orla ao nascer do sol, casa clara com sombra dura e deck minimalista.",
      visualStyle: "Luz solar suave, lentes longas para textura, câmera fluida e paleta areia, off-white e coral.",
      callToAction: "Conheça a coleção Horizonte 2026",
    },
    outputData:
      "ROTEIRO FINAL\n\nAbertura: luz de manhã atravessa tecidos e detalhes de acabamento.\n\nDesenvolvimento: modelo em movimento entre areia, arquitetura clara e água. Corte alterna macro de textura, plano aberto e uso real da peça.\n\nFechamento: coleção apresentada em composição limpa, assinatura Brisa Norte e CTA para lançamento.",
  },
  {
    toolId: "roteiro",
    formData: { etapa: "Roteiro final" },
    outputData: "Roteiro aprovado com estrutura de abertura, desenvolvimento e fechamento.",
  },
  {
    toolId: "decupagem",
    formData: { etapa: "Decupagem em andamento" },
    outputData: "32 planos definidos entre macro, movimento, produto e assinatura visual.",
  },
  {
    toolId: "callsheet",
    formData: { etapa: "Callsheet pronto" },
    outputData: "Diária 05:30-17:30, equipe reduzida, praia + locação branca, backup em set.",
  },
  {
    toolId: "orcamento",
    formData: { etapa: "Orçamento aprovado" },
    outputData: "Investimento previsto: R$ 48.000 com produção, equipe, pós e entregas digitais.",
  },
];

async function responseJson(response, label) {
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-json: ${text.slice(0, 400)}`);
  }
  if (!response.ok() || !json.success) {
    throw new Error(`${label} failed (${response.status()}): ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function ensureDemoIdentity(context) {
  await responseJson(
    await context.request.put(`${baseURL}/api/auth/profile`, {
      data: demoUser,
    }),
    "update capture profile",
  );

  await responseJson(
    await context.request.put(`${baseURL}/api/studio-settings`, {
      data: {
        studioName: demoUser.studioName,
        legalName: "Lume Filmes LTDA",
        email: "contato@lumefilmes.example",
        phone: "+55 11 95555-2026",
        city: "Sao Paulo",
        website: "https://lumefilmes.example",
        signature: demoUser.name,
      },
    }),
    "update capture studio",
  );
}

async function ensureDemoProject(context) {
  const projects = await responseJson(await context.request.get(`${baseURL}/api/projects`), "list projects");
  let project = projects.find((item) => item.name === demoProjectName);

  if (!project) {
    const client = await responseJson(
      await context.request.post(`${baseURL}/api/clients`, {
        data: {
          name: demoClient.name,
          company: demoClient.name,
          email: demoClient.email,
          phone: "+55 11 90000-2026",
          status: "active",
          notes: "Cliente ficticio usado nas capturas da landing.",
        },
      }),
      "create client",
    );

    project = await responseJson(
      await context.request.post(`${baseURL}/api/projects`, {
        data: {
          name: demoProjectName,
          description:
            "Projeto ficticio preenchido para apresentar a operação completa: briefing, IA, hub, arquivos, aprovações e documentos em um fluxo comercial real.",
          clientId: client.id,
          metadataJson: JSON.stringify(metadata),
        },
      }),
      "create project",
    );
  } else {
    project = await responseJson(
      await context.request.put(`${baseURL}/api/projects/${project.id}`, {
        data: {
          name: demoProjectName,
          description:
            "Projeto ficticio preenchido para apresentar a operação completa: briefing, IA, hub, arquivos, aprovações e documentos em um fluxo comercial real.",
          status: "active",
          metadataJson: JSON.stringify(metadata),
        },
      }),
      "update project",
    );
  }

  for (const state of toolStates) {
    await responseJson(
      await context.request.post(`${baseURL}/api/projects/${project.id}/state`, {
        data: state,
      }),
      `save state ${state.toolId}`,
    );
  }

  return project;
}

async function captureSocialImage(browser) {
  await fs.mkdir(socialOutputDir, { recursive: true });

  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.setItem("language", "pt");
  });

  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("heading", { level: 1 }).waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(900);
  await page.screenshot({
    path: path.join(socialOutputDir, "cena-product.png"),
    animations: "disabled",
  });
  await context.close();
  console.log("captured cena-product.png");
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 810 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.setItem("language", "pt");
    window.localStorage.setItem("cena-studio-welcome-completed", "true");
    window.localStorage.setItem("cena-studio-welcome-dismissed", "true");
  });

  const page = await context.newPage();
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(adminPassword);
  await page.getByRole("button", { name: /entrar no estúdio|enter studio/i }).click();
  await page.waitForURL(/\/admin|\/tools/);

  await ensureDemoIdentity(context);
  const project = await ensureDemoProject(context);

  const captures = [
    { path: "/dashboard", filename: "dashboard.png", marker: /Central da Opera..o|Operations Center/i },
    { path: `/project/${project.id}`, filename: "project-hub.png", marker: /Colecao Horizonte 2026|Projeto/i },
    { path: `/project/${project.id}/studio/01`, filename: "studio.png", marker: /ROTEIRO FINAL|Studio|Roteiro/i },
  ];

    for (const capture of captures) {
    await page.goto(capture.path);
    await page.waitForLoadState("networkidle");
    await page.locator("body").evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      window.localStorage.setItem("theme", "dark");
    });
    await page.waitForTimeout(600);
    await page.getByText(capture.marker).first().waitFor({ state: "visible", timeout: 15_000 });
    if (capture.filename === "studio.png") {
      const visibleFields = page.locator(".studio-input-panel input:visible, .studio-input-panel textarea:visible");
      const values = [
        "Brisa Norte: Horizonte 2026",
        "60 segundos",
        "Lifestyle premium",
        "Uma pessoa atravessa a manhã entre arquitetura clara, vento e paisagem costeira. A coleção aparece em movimento real, textura e detalhe.",
        "Modelo principal e figurantes lifestyle",
      ];
      const count = Math.min(await visibleFields.count(), values.length);
      for (let index = 0; index < count; index += 1) {
        const field = visibleFields.nth(index);
        await field.fill(values[index]);
      }
      await page.locator(".studio-input-panel").click({ position: { x: 12, y: 12 } }).catch(() => null);
      await page.locator(".studio-input-panel input, .studio-input-panel textarea").evaluateAll((nodes) => {
        for (const node of nodes) node.scrollLeft = 0;
      });
      await page.waitForTimeout(2500);
    }
    await page.screenshot({
      path: path.join(outputDir, capture.filename),
      fullPage: false,
      animations: "disabled",
    });
    console.log(`captured ${capture.filename}`);
  }

  await captureSocialImage(browser);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
