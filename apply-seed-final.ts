#!/usr/bin/env tsx
/**
 * Apply Seed - Final Version
 * Limpa elytraprod + Aplica seed em admin
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';

// Setup adapter (mesma configuração do servidor)
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrado no .env');
  process.exit(1);
}

function getPostgresRuntimeConfig(url: string) {
  try {
    const parsed = new URL(url);
    const usesSupabase =
      parsed.hostname.endsWith(".supabase.com") || parsed.hostname.endsWith(".supabase.co");

    if (usesSupabase) {
      parsed.searchParams.delete("sslmode");
      return {
        connectionString: parsed.toString(),
        ssl: { rejectUnauthorized: false } as const,
      };
    }
  } catch {
    // ignore
  }

  return { connectionString: url, ssl: undefined };
}

const runtimeConfig = getPostgresRuntimeConfig(databaseUrl);

const adapter = new PrismaPg({
  connectionString: runtimeConfig.connectionString,
  max: 1,
  connectionTimeoutMillis: 30_000,
  idleTimeoutMillis: 10_000,
  ssl: runtimeConfig.ssl,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('\n🌱 CenaStudio - Apply Seed Data\n');

  // Load seed
  const seedData = JSON.parse(fs.readFileSync('./seed-data.json', 'utf-8'));
  console.log('✅ Loaded seed-data.json\n');

  // 1. LIMPAR elytraprod
  console.log('🧹 Limpando elytraprod@gmail.com...');
  const elytraprod = await prisma.user.findUnique({
    where: { email: 'elytraprod@gmail.com' }
  });

  if (elytraprod) {
    await prisma.videoComment.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.videoReview.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.file.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.notification.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.financialEntry.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.interaction.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.opportunity.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.collaborator.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.project.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.client.deleteMany({ where: { userId: elytraprod.id } });
    console.log('✅ elytraprod limpo\n');
  }

  // 2. LIMPAR admin
  console.log('🧹 Limpando admin@cenastudio.com.br...');
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@cenastudio.com.br' }
  });

  if (!admin) {
    console.error('❌ admin não encontrado!');
    process.exit(1);
  }

  await prisma.videoComment.deleteMany({ where: { userId: admin.id } });
  await prisma.videoReview.deleteMany({ where: { userId: admin.id } });
  await prisma.file.deleteMany({ where: { userId: admin.id } });
  await prisma.notification.deleteMany({ where: { userId: admin.id } });
  await prisma.financialEntry.deleteMany({ where: { userId: admin.id } });
  await prisma.interaction.deleteMany({ where: { userId: admin.id } });
  await prisma.opportunity.deleteMany({ where: { userId: admin.id } });
  await prisma.collaborator.deleteMany({ where: { userId: admin.id } });
  await prisma.project.deleteMany({ where: { userId: admin.id } });
  await prisma.client.deleteMany({ where: { userId: admin.id } });
  console.log('✅ Cleanup completo\n');

  // 3. SEED
  console.log('🌱 Aplicando seed...\n');

  // Clients
  console.log('👥 Clientes...');
  const clientMap = new Map<number, bigint>();
  for (const c of seedData.clients) {
    const client = await prisma.client.create({
      data: {
        userId: admin.id,
        name: c.name,
        company: c.company,
        email: c.email,
        phone: c.phone,
        segment: c.segment,
        status: c.status,
        workflowStage: c.workflowStage,
        totalSpent: c.totalSpent,
        city: c.city,
        state: c.state,
        industry: c.industry,
        contactPerson: c.contactPerson,
        contactRole: c.contactRole,
        notes: `Demo - ${c.name}`,
      }
    });
    clientMap.set(c.id, client.id);
  }
  console.log(`✓ ${clientMap.size} clientes`);

  // Projects
  console.log('📁 Projetos...');
  const projectMap = new Map<number, bigint>();
  for (const p of seedData.projects) {
    const project = await prisma.project.create({
      data: {
        userId: admin.id,
        clientId: clientMap.get(p.clientId)!,
        name: p.name,
        description: p.description,
        status: p.status,
        deadline: p.deadline ? new Date(p.deadline) : null,
        progress: p.progress || 0,
        metadataJson: JSON.stringify(p.metadataJson),
      }
    });
    projectMap.set(p.id, project.id);
  }
  console.log(`✓ ${projectMap.size} projetos`);

  // Opportunities
  console.log('💼 Oportunidades...');
  for (const o of seedData.opportunities) {
    await prisma.opportunity.create({
      data: {
        userId: admin.id,
        clientId: clientMap.get(o.clientId)!,
        title: o.title,
        stage: o.stage,
        estimatedValue: o.estimatedValue,
        probability: o.probability,
        expectedCloseDate: o.expectedCloseDate ? new Date(o.expectedCloseDate) : null,
      }
    });
  }
  console.log(`✓ ${seedData.opportunities.length} oportunidades`);

  // Interactions
  console.log('💬 Interações...');
  for (const i of seedData.interactions) {
    await prisma.interaction.create({
      data: {
        userId: admin.id,
        clientId: clientMap.get(i.clientId)!,
        type: i.type,
        subject: i.subject,
        notes: i.notes,
        nextFollowUp: i.nextFollowUp ? new Date(i.nextFollowUp) : null,
      }
    });
  }
  console.log(`✓ ${seedData.interactions.length} interações`);

  // Financial
  console.log('💰 Financeiro...');
  for (const f of seedData.financialEntries) {
    await prisma.financialEntry.create({
      data: {
        userId: admin.id,
        clientId: f.clientId ? clientMap.get(f.clientId)! : null,
        kind: f.kind,
        description: f.description,
        category: f.category,
        amount: f.amount,
        status: f.status,
        dueDate: new Date(f.dueDate),
        paidAt: f.paidAt ? new Date(f.paidAt) : null,
        recurrence: f.recurrence,
        isFixed: Boolean(f.isFixed),
      }
    });
  }
  console.log(`✓ ${seedData.financialEntries.length} lançamentos`);

  // Files
  console.log('📎 Arquivos...');
  for (const file of seedData.projectFiles) {
    await prisma.file.create({
      data: {
        projectId: projectMap.get(file.projectId)!,
        userId: admin.id,
        filename: file.storedName,
        originalName: file.originalName,
        path: `/uploads/${file.storedName}`, // Path obrigatório
        mimeType: file.mimeType,
        size: file.sizeBytes,
        category: 'general',
      }
    });
  }
  console.log(`✓ ${seedData.projectFiles.length} arquivos`);

  // Reviews
  console.log('🎬 Video Reviews...');
  const reviewMap = new Map<number, bigint>();
  for (const r of seedData.videoReviews) {
    const review = await prisma.videoReview.create({
      data: {
        projectId: projectMap.get(r.projectId)!,
        userId: admin.id,
        title: r.title,
        description: r.description,
        status: r.status,
        videoUrl: r.videoUrl,
        shareToken: r.shareToken,
      }
    });
    reviewMap.set(r.id, review.id);
  }
  console.log(`✓ ${reviewMap.size} reviews`);

  // Comments
  console.log('💭 Comentários...');
  for (const c of seedData.videoComments) {
    await prisma.videoComment.create({
      data: {
        reviewId: reviewMap.get(c.reviewId)!,
        userId: admin.id,
        authorName: c.authorName,
        timestampSeconds: c.timestampSeconds,
        comment: c.comment,
        annotations: JSON.stringify(c.annotations || []),
        resolved: Boolean(c.resolved),
      }
    });
  }
  console.log(`✓ ${seedData.videoComments.length} comentários`);

  // Collaborators
  console.log('👷 Colaboradores...');
  for (const collab of seedData.collaborators) {
    await prisma.collaborator.create({
      data: {
        userId: admin.id,
        name: collab.name,
        email: collab.email,
        role: collab.role,
        phone: collab.phone,
        skills: collab.skills,
        dailyRate: collab.dailyRate,
        status: collab.status,
      }
    });
  }
  console.log(`✓ ${seedData.collaborators.length} colaboradores`);

  // States
  console.log('🤖 Estados IA...');
  for (const state of seedData.projectStates) {
    await prisma.projectState.create({
      data: {
        projectId: projectMap.get(state.projectId)!,
        toolId: state.toolId,
        formData: JSON.stringify(state.formData),
      }
    });
  }
  console.log(`✓ ${seedData.projectStates.length} estados\n`);

  // RESUMO
  console.log('='.repeat(80));
  console.log('🎉 SEED APLICADO!\n');
  console.log('✅ elytraprod@gmail.com → LIMPO');
  console.log('✅ admin@cenastudio.com.br → SEED DEMO\n');
  console.log('📈 Criados:');
  console.log(`   👥 ${clientMap.size} clientes`);
  console.log(`   📁 ${projectMap.size} projetos`);
  console.log(`   💼 ${seedData.opportunities.length} oportunidades`);
  console.log(`   💬 ${seedData.interactions.length} interações`);
  console.log(`   💰 ${seedData.financialEntries.length} lançamentos`);
  console.log(`   📎 ${seedData.projectFiles.length} arquivos`);
  console.log(`   🎬 ${reviewMap.size} reviews`);
  console.log(`   💭 ${seedData.videoComments.length} comentários`);
  console.log(`   👷 ${seedData.collaborators.length} colaboradores`);
  console.log(`   🤖 ${seedData.projectStates.length} estados IA\n`);
  console.log('✨ Pronto para apresentação!');
  console.log('🔐 admin@cenastudio.com.br / admin123');
  console.log('🔗 http://localhost:5173\n');
  console.log('='.repeat(80) + '\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Erro:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
