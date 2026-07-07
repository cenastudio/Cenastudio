import bcrypt from "bcryptjs";
import { TOOLS } from "../../shared/tools.js";
import { prisma, shouldUsePrisma } from "./prisma.js";

const plans = [
  {
    id: "free",
    name: "Free",
    priceBrl: 0,
    generationLimit: 5,
    features: ["5 clientes", "5 gerações/mês", "8 ferramentas IA", "Export .txt"],
  },
  {
    id: "pro",
    name: "Pro",
    priceBrl: 19900,
    generationLimit: 100,
    features: ["15 clientes", "+ Clientes adicionais", "100 gerações/mês", "12 ferramentas IA", "Pipeline", "Video Reviews", "Export PDF/DOCX", "Colaboração (5 membros)"],
  },
  {
    id: "studio",
    name: "Studio",
    priceBrl: 39900,
    generationLimit: -1,
    features: ["50 clientes", "+ Clientes adicionais", "Gerações ilimitadas", "12 ferramentas IA", "Commercial Hub", "Módulo Financeiro", "Equipe ilimitada", "API Access", "Suporte premium"],
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

  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "admin123";
  const existingAdmin = await prisma.user.findUnique({ where: { email: "admin@cenastudio.com.br" } });
  const rotateAdminPassword =
    existingAdmin &&
    process.env.ADMIN_DEFAULT_PASSWORD &&
    !bcrypt.compareSync(adminPassword, existingAdmin.passwordHash);
  const admin = await prisma.user.upsert({
    where: { email: "admin@cenastudio.com.br" },
    create: {
      name: "Admin",
      email: "admin@cenastudio.com.br",
      passwordHash: bcrypt.hashSync(adminPassword, 12),
      role: "admin",
      emailVerified: true,
    },
    update: {
      role: "admin",
      emailVerified: true,
      ...(rotateAdminPassword ? { passwordHash: bcrypt.hashSync(adminPassword, 12) } : {}),
    },
  });
  await ensureSubscription(admin.id, "studio", "active");

  const demoPassword = process.env.DEMO_USER_PASSWORD || "demo123";
  const existingDemo = await prisma.user.findUnique({ where: { email: "demo@cenastudio.com.br" } });
  const rotateDemoPassword =
    existingDemo &&
    process.env.DEMO_USER_PASSWORD &&
    !bcrypt.compareSync(demoPassword, existingDemo.passwordHash);
  const demo = await prisma.user.upsert({
    where: { email: "demo@cenastudio.com.br" },
    create: {
      name: "Demo User",
      email: "demo@cenastudio.com.br",
      passwordHash: bcrypt.hashSync(demoPassword, 12),
      role: "user",
      emailVerified: true,
    },
    update: {
      emailVerified: true,
      ...(rotateDemoPassword ? { passwordHash: bcrypt.hashSync(demoPassword, 12) } : {}),
    },
  });
  await ensureSubscription(demo.id, "free", "active");
}
