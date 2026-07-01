import bcrypt from "bcryptjs";
import { TOOLS } from "../../shared/tools.js";
import { prisma, shouldUsePrisma } from "./prisma.js";

const plans = [
  {
    id: "free",
    name: "Free",
    priceBrl: 0,
    generationLimit: 5,
    features: ["5 gerações/mês", "Acesso a 6 ferramentas", "Export .txt"],
  },
  {
    id: "pro",
    name: "Pro",
    priceBrl: 4900,
    generationLimit: 50,
    features: ["50 gerações/mês", "Fluxos principais de produção", "Export PDF e DOCX", "Histórico completo"],
  },
  {
    id: "studio",
    name: "Studio",
    priceBrl: 9900,
    generationLimit: -1,
    features: ["Gerações ilimitadas", "Fluxos principais de produção", "Projetos e pastas", "Suporte prioritário"],
  },
];

async function ensureSubscription(userId: bigint, planId: string, status = "active") {
  const existing = await prisma.subscription.findFirst({ where: { userId } });
  if (!existing) {
    await prisma.subscription.create({
      data: {
        userId,
        planId,
        status,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

export async function initPrismaCoreData() {
  if (!shouldUsePrisma) return;

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: {
        name: plan.name,
        priceBrl: plan.priceBrl,
        generationLimit: plan.generationLimit,
        features: plan.features,
      },
    });
  }

  for (const tool of TOOLS) {
    await prisma.tool.upsert({
      where: { id: tool.id },
      create: {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        isActive: true,
      },
      update: {
        name: tool.name,
        description: tool.description,
        category: tool.category,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  const admin = await prisma.user.upsert({
    where: { email: "admin@cenastudio.com.br" },
    create: {
      name: "Admin",
      email: "admin@cenastudio.com.br",
      passwordHash: bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD || "admin123", 12),
      role: "admin",
      emailVerified: true,
    },
    update: { role: "admin", emailVerified: true },
  });
  await ensureSubscription(admin.id, "studio", "active");

  const demo = await prisma.user.upsert({
    where: { email: "demo@cenastudio.com.br" },
    create: {
      name: "Demo User",
      email: "demo@cenastudio.com.br",
      passwordHash: bcrypt.hashSync(process.env.DEMO_USER_PASSWORD || "demo123", 12),
      role: "user",
      emailVerified: true,
    },
    update: {},
  });
  await ensureSubscription(demo.id, "free", "active");
}
