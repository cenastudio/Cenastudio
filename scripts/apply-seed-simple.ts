/**
 * Apply seed-data.json - Versão Simples
 *
 * 1. Limpa dados de elytraprod@gmail.com (dados reais)
 * 2. Aplica seed demo em admin@cenastudio.com.br (apresentação)
 */

import 'dotenv/config';
import { prisma } from '../server/models/prisma.js';
import fs from 'fs';

console.log('\n🌱 CenaStudio - Apply Seed Data\n');

try {
  // Load seed data
  const seedData = JSON.parse(fs.readFileSync('./seed-data.json', 'utf-8'));
  console.log('✅ Loaded seed-data.json\n');

  // 1. LIMPAR elytraprod@gmail.com (dados reais)
  console.log('🧹 Limpando dados de elytraprod@gmail.com...');
  const elytraprod = await prisma.user.findUnique({
    where: { email: 'elytraprod@gmail.com' }
  });

  if (elytraprod) {
    await prisma.videoComment.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.videoReview.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.projectState.deleteMany({
      where: { project: { userId: elytraprod.id } }
    });
    await prisma.projectFile.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.notification.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.financialEntry.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.interaction.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.opportunity.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.collaborator.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.project.deleteMany({ where: { userId: elytraprod.id } });
    await prisma.client.deleteMany({ where: { userId: elytraprod.id } });
    console.log('✅ elytraprod@gmail.com limpo\n');
  }

  // 2. PREPARAR admin@cenastudio.com.br
  console.log('🧹 Limpando dados antigos de admin@cenastudio.com.br...');
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@cenastudio.com.br' }
  });

  if (!admin) {
    console.error('❌ admin@cenastudio.com.br não encontrado!');
    process.exit(1);
  }

  await prisma.videoComment.deleteMany({ where: { userId: admin.id } });
  await prisma.videoReview.deleteMany({ where: { userId: admin.id } });
  await prisma.projectState.deleteMany({
    where: { project: { userId: admin.id } }
  });
  await prisma.projectFile.deleteMany({ where: { userId: admin.id } });
  await prisma.notification.deleteMany({ where: { userId: admin.id } });
  await prisma.financialEntry.deleteMany({ where: { userId: admin.id } });
  await prisma.interaction.deleteMany({ where: { userId: admin.id } });
  await prisma.opportunity.deleteMany({ where: { userId: admin.id } });
  await prisma.collaborator.deleteMany({ where: { userId: admin.id } });
  await prisma.project.deleteMany({ where: { userId: admin.id } });
  await prisma.client.deleteMany({ where: { userId: admin.id } });
  console.log('✅ Cleanup completo\n');

  // 3. APLICAR SEED
  console.log('🌱 Aplicando seed demo...\n');

  // Clients
  console.log('👥 Criando clientes...');
  const clientMap = new Map();
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
    console.log(`  ✓ ${client.name}`);
  }

  // Projects
  console.log('\n📁 Criando projetos...');
  const projectMap = new Map();
  for (const p of seedData.projects) {
    const project = await prisma.project.create({
      data: {
        userId: admin.id,
        clientId: clientMap.get(p.clientId),
        name: p.name,
        description: p.description,
        status: p.status,
        deadline: p.deadline ? new Date(p.deadline) : null,
        progress: p.progress || 0,
        metadataJson: JSON.stringify(p.metadataJson),
      }
    });
    projectMap.set(p.id, project.id);
    console.log(`  ✓ ${project.name}`);
  }

  // Opportunities
  console.log('\n💼 Criando oportunidades...');
  for (const o of seedData.opportunities) {
    await prisma.opportunity.create({
      data: {
        userId: admin.id,
        clientId: clientMap.get(o.clientId),
        title: o.title,
        stage: o.stage,
        estimatedValue: o.estimatedValue,
        probability: o.probability,
        expectedCloseDate: o.expectedCloseDate ? new Date(o.expectedCloseDate) : null,
      }
    });
  }
  console.log(`  ✓ ${seedData.opportunities.length} oportunidades`);

  // Interactions
  console.log('\n💬 Criando interações...');
  for (const i of seedData.interactions) {
    await prisma.interaction.create({
      data: {
        userId: admin.id,
        clientId: clientMap.get(i.clientId),
        type: i.type,
        subject: i.subject,
        notes: i.notes,
        nextFollowUp: i.nextFollowUp ? new Date(i.nextFollowUp) : null,
      }
    });
  }
  console.log(`  ✓ ${seedData.interactions.length} interações`);

  // Financial Entries
  console.log('\n💰 Criando lançamentos financeiros...');
  for (const f of seedData.financialEntries) {
    await prisma.financialEntry.create({
      data: {
        userId: admin.id,
        clientId: f.clientId ? clientMap.get(f.clientId) : null,
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
  console.log(`  ✓ ${seedData.financialEntries.length} lançamentos`);

  // Project Files
  console.log('\n📎 Criando arquivos...');
  for (const file of seedData.projectFiles) {
    await prisma.projectFile.create({
      data: {
        projectId: projectMap.get(file.projectId),
        userId: admin.id,
        originalName: file.originalName,
        storedName: file.storedName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      }
    });
  }
  console.log(`  ✓ ${seedData.projectFiles.length} arquivos`);

  // Video Reviews
  console.log('\n🎬 Criando video reviews...');
  const reviewMap = new Map();
  for (const r of seedData.videoReviews) {
    const review = await prisma.videoReview.create({
      data: {
        projectId: projectMap.get(r.projectId),
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
  console.log(`  ✓ ${seedData.videoReviews.length} reviews`);

  // Video Comments
  console.log('\n💭 Criando comentários...');
  for (const c of seedData.videoComments) {
    await prisma.videoComment.create({
      data: {
        reviewId: reviewMap.get(c.reviewId),
        userId: admin.id,
        authorName: c.authorName,
        timestampSeconds: c.timestampSeconds,
        comment: c.comment,
        annotations: JSON.stringify(c.annotations || []),
        resolved: Boolean(c.resolved),
      }
    });
  }
  console.log(`  ✓ ${seedData.videoComments.length} comentários`);

  // Collaborators
  console.log('\n👷 Criando colaboradores...');
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
  console.log(`  ✓ ${seedData.collaborators.length} colaboradores`);

  // Project States
  console.log('\n🤖 Criando estados IA...');
  for (const state of seedData.projectStates) {
    await prisma.projectState.create({
      data: {
        projectId: projectMap.get(state.projectId),
        toolId: state.toolId,
        formData: JSON.stringify(state.formData),
      }
    });
  }
  console.log(`  ✓ ${seedData.projectStates.length} estados`);

  // RESUMO
  console.log('\n' + '='.repeat(80));
  console.log('🎉 SEED APLICADO COM SUCESSO!\n');
  console.log('📊 Resumo:');
  console.log(`   ✅ elytraprod@gmail.com → LIMPO`);
  console.log(`   ✅ admin@cenastudio.com.br → SEED DEMO APLICADO\n`);
  console.log('📈 Dados criados:');
  console.log(`   👥 Clientes: ${clientMap.size}`);
  console.log(`   📁 Projetos: ${projectMap.size}`);
  console.log(`   💼 Oportunidades: ${seedData.opportunities.length}`);
  console.log(`   💬 Interações: ${seedData.interactions.length}`);
  console.log(`   💰 Lançamentos: ${seedData.financialEntries.length}`);
  console.log(`   📎 Arquivos: ${seedData.projectFiles.length}`);
  console.log(`   🎬 Reviews: ${reviewMap.size}`);
  console.log(`   💭 Comentários: ${seedData.videoComments.length}`);
  console.log(`   👷 Colaboradores: ${seedData.collaborators.length}`);
  console.log(`   🤖 Estados IA: ${seedData.projectStates.length}`);
  console.log('\n✨ Plataforma pronta para apresentação!');
  console.log('🔐 Login: admin@cenastudio.com.br / admin123');
  console.log('🔗 http://localhost:5173\n');
  console.log('='.repeat(80) + '\n');

} catch (error) {
  console.error('\n❌ Erro:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
