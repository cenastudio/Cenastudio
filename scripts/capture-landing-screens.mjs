import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.LANDING_CAPTURE_BASE_URL || "http://127.0.0.1:5173";
const adminEmail = process.env.LANDING_CAPTURE_EMAIL || "admin@cenastudio.com.br";
const adminPassword = process.env.LANDING_CAPTURE_PASSWORD || "admin123";
const outputDir = path.join(process.cwd(), "client", "public", "landing", "product");

const demoProjectName = "Campanha Verão 2026 - Demo Landing";
const metadata = {
  projectType: "Campanha audiovisual",
  deadline: "2026-08-15",
  objective:
    "Lançar uma campanha vertical e horizontal para uma marca de moda praia, com narrativa premium, calendário de aprovação e entregáveis por canal.",
  creativeGoals: {
    format: "Hero film 60s + Reels 9:16 + cortes para tráfego pago",
    client: "Atlântica Beachwear",
    tone: "Solar, sofisticado, documental e comercial",
    budget: "R$ 48.000",
  },
};

const toolStates = [
  {
    toolId: "07",
    formData: {
      cliente: "Atlântica Beachwear",
      objetivo: metadata.objective,
      publico: "Mulheres 24-38, consumidoras premium de moda praia e lifestyle.",
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
      title: "Atlântica Verão 2026",
      format: "Hero film 60s + Reels 9:16",
      duration: "60 segundos",
      genre: "Comercial lifestyle premium",
      synopsis:
        "Uma mulher atravessa a manhã entre arquitetura branca, vento e mar. A coleção aparece em movimento real, textura e detalhe, conectando desejo, liberdade e acabamento.",
      characters:
        "Modelo principal 28 anos, direção natural e elegante. Figurantes em cenas de lifestyle ao fundo, sem roubar foco da peça.",
      locations: "Praia clara ao nascer do sol, casa branca com sombra dura e deck minimalista.",
      visualStyle: "Luz solar suave, lentes longas para textura, câmera fluida e paleta areia, off-white e coral.",
      callToAction: "Conheça a coleção Verão 2026",
    },
    outputData:
      "ROTEIRO FINAL\n\nAbertura: luz de manhã atravessa tecidos, pele molhada e detalhes de acabamento.\n\nDesenvolvimento: modelo em movimento entre areia, arquitetura branca e água. Corte alterna macro de textura, plano aberto e uso real da peça.\n\nFechamento: coleção apresentada em composição limpa, assinatura Atlântica Beachwear e CTA para lançamento.",
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

async function ensureDemoProject(context) {
  const projects = await responseJson(await context.request.get(`${baseURL}/api/projects`), "list projects");
  let project = projects.find((item) => item.name === demoProjectName);

  if (!project) {
    const client = await responseJson(
      await context.request.post(`${baseURL}/api/clients`, {
        data: {
          name: "Atlântica Beachwear",
          company: "Atlântica Beachwear",
          email: "marketing@atlanticabeachwear.com",
          phone: "+55 11 90000-2026",
          status: "active",
          notes: "Cliente demo usado nas capturas da landing.",
        },
      }),
      "create client",
    );

    project = await responseJson(
      await context.request.post(`${baseURL}/api/projects`, {
        data: {
          name: demoProjectName,
          description:
            "Projeto demo preenchido para apresentar a operação completa: briefing, IA, hub, arquivos, aprovações e documentos em um fluxo comercial real.",
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
            "Projeto demo preenchido para apresentar a operação completa: briefing, IA, hub, arquivos, aprovações e documentos em um fluxo comercial real.",
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

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 810 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    window.localStorage.setItem("theme", "light");
    window.localStorage.setItem("language", "pt");
  });

  const page = await context.newPage();
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(adminPassword);
  await page.getByRole("button", { name: /entrar no estúdio|enter studio/i }).click();
  await page.waitForURL(/\/admin|\/tools/);

  const project = await ensureDemoProject(context);

  const captures = [
    { path: "/dashboard", filename: "dashboard.png", marker: /Central do Diretor|Director/i },
    { path: `/project/${project.id}`, filename: "project-hub.png", marker: /Campanha Verão 2026|Projeto/i },
    { path: `/project/${project.id}/studio/01`, filename: "studio.png", marker: /ROTEIRO FINAL|Studio|Roteiro/i },
  ];

    for (const capture of captures) {
    await page.goto(capture.path);
    await page.waitForLoadState("networkidle");
    await page.locator("body").evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      window.localStorage.setItem("theme", "light");
    });
    await page.waitForTimeout(600);
    await page.getByText(capture.marker).first().waitFor({ state: "visible", timeout: 15_000 });
    if (capture.filename === "studio.png") {
      const visibleFields = page.locator(".studio-input-panel input:visible, .studio-input-panel textarea:visible");
      const values = [
        "Atlântica Verão 2026",
        "60 segundos",
        "Moda praia premium",
        "Uma mulher atravessa a manhã entre arquitetura branca, vento e mar. A coleção aparece em movimento real, textura e detalhe.",
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

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
