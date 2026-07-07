/**
 * Apply seed-data.json to Supabase via Prisma
 *
 * Popula o banco Supabase com todos os dados demo do seed-data.json
 * para deixar a plataforma 100% preenchida para apresentação.
 *
 * ⚠️ ATENÇÃO: Este script LIMPA todos os dados do usuário antes de aplicar o seed!
 *
 * Uso:
 *   node scripts/apply-seed-data.mjs
 *   node scripts/apply-seed-data.mjs --user admin@cenastudio.com.br
 *   node scripts/apply-seed-data.mjs --user elytraprod@gmail.com
 */

import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Parse command line args
const args = process.argv.slice(2);
const userEmailArg = args.find(arg => arg.startsWith('--user='))?.split('=')[1];
const targetEmail = userEmailArg || 'admin@cenastudio.com.br';

console.log('\n🌱 CenaStudio - Apply Seed Data\n');
console.log(`📧 Target user: ${targetEmail}\n`);

async function main() {
  // 1. Load seed data
  const seedPath = path.join(__dirname, '..', 'seed-data.json');
  if (!fs.existsSync(seedPath)) {
    console.error('❌ seed-data.json not found!');
    process.exit(1);
  }

  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  console.log('✅ Loaded seed-data.json\n');

  // 2. Get target user
  const user = await prisma.user.findUnique({
    where: { email: targetEmail }
  });

  if (!user) {
    console.error(`❌ User ${targetEmail} not found!`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.name} (ID: ${user.id})\n`);

  // 3. Cleanup existing data
  console.log('🧹 Cleaning up existing data...');

  await prisma.videoComment.deleteMany({ where: { userId: user.id } });
  await prisma.videoReview.deleteMany({ where: { userId: user.id } });
  await prisma.projectState.deleteMany({
    where: { project: { userId: user.id } }
  });
  await prisma.projectFile.deleteMany({ where: { userId: user.id } });
  await prisma.notification.deleteMany({ where: { userId: user.id } });
  await prisma.financialEntry.deleteMany({ where: { userId: user.id } });
  await prisma.interaction.deleteMany({ where: { userId: user.id } });
  await prisma.opportunity.deleteMany({ where: { userId: user.id } });
  await prisma.collaborator.deleteMany({ where: { userId: user.id } });
  await prisma.project.deleteMany({ where: { userId: user.id } });
  await prisma.client.deleteMany({ where: { userId: user.id } });

  console.log('✅ Cleanup complete\n');

  // 4. Seed Clients
  console.log('👥 Seeding clients...');
  const clientMap = new Map();

  for (const clientData of seedData.clients) {
    const client = await prisma.client.create({
      data: {
        userId: user.id,
        name: clientData.name,
        company: clientData.company,
        email: clientData.email,
        phone: clientData.phone,
        segment: clientData.segment,
        status: clientData.status,
        workflowStage: clientData.workflowStage,
        totalSpent: clientData.totalSpent,
        city: clientData.city,
        state: clientData.state,
        industry: clientData.industry,
        contactPerson: clientData.contactPerson,
        contactRole: clientData.contactRole,
        notes: `Cliente demo - ${clientData.name}`,
      }
    });

    clientMap.set(clientData.id, client.id);
    console.log(`  ✓ ${client.name}`);
  }
  console.log(`✅ Created ${clientMap.size} clients\n`);

  // 5. Seed Projects
  console.log('📁 Seeding projects...');
  const projectMap = new Map();

  for (const projectData of seedData.projects) {
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        clientId: clientMap.get(projectData.clientId),
        name: projectData.name,
        description: projectData.description,
        status: projectData.status,
        deadline: projectData.deadline ? new Date(projectData.deadline) : null,
        progress: projectData.progress || 0,
        metadataJson: JSON.stringify(projectData.metadataJson),
      }
    });

    projectMap.set(projectData.id, project.id);
    console.log(`  ✓ ${project.name}`);
  }
  console.log(`✅ Created ${projectMap.size} projects\n`);

  // 6. Seed Opportunities
  console.log('💼 Seeding opportunities...');

  for (const oppData of seedData.opportunities) {
    await prisma.opportunity.create({
      data: {
        userId: user.id,
        clientId: clientMap.get(oppData.clientId),
        title: oppData.title,
        stage: oppData.stage,
        estimatedValue: oppData.estimatedValue,
        probability: oppData.probability,
        expectedCloseDate: oppData.expectedCloseDate ? new Date(oppData.expectedCloseDate) : null,
      }
    });
  }
  console.log(`✅ Created ${seedData.opportunities.length} opportunities\n`);

  // 7. Seed Interactions
  console.log('💬 Seeding interactions...');

  for (const intData of seedData.interactions) {
    await prisma.interaction.create({
      data: {
        userId: user.id,
        clientId: clientMap.get(intData.clientId),
        opportunityId: intData.opportunityId ? undefined : null, // Skip for now
        type: intData.type,
        subject: intData.subject,
        notes: intData.notes,
        nextFollowUp: intData.nextFollowUp ? new Date(intData.nextFollowUp) : null,
      }
    });
  }
  console.log(`✅ Created ${seedData.interactions.length} interactions\n`);

  // 8. Seed Financial Entries
  console.log('💰 Seeding financial entries...');

  for (const finData of seedData.financialEntries) {
    await prisma.financialEntry.create({
      data: {
        userId: user.id,
        clientId: finData.clientId ? clientMap.get(finData.clientId) : null,
        kind: finData.kind,
        description: finData.description,
        category: finData.category,
        amount: finData.amount,
        status: finData.status,
        dueDate: new Date(finData.dueDate),
        paidAt: finData.paidAt ? new Date(finData.paidAt) : null,
        recurrence: finData.recurrence,
        isFixed: Boolean(finData.isFixed),
      }
    });
  }
  console.log(`✅ Created ${seedData.financialEntries.length} financial entries\n`);

  // 9. Seed Project Files
  console.log('📎 Seeding project files...');

  for (const fileData of seedData.projectFiles) {
    await prisma.projectFile.create({
      data: {
        projectId: projectMap.get(fileData.projectId),
        userId: user.id,
        originalName: fileData.originalName,
        storedName: fileData.storedName,
        mimeType: fileData.mimeType,
        sizeBytes: fileData.sizeBytes,
      }
    });
  }
  console.log(`✅ Created ${seedData.projectFiles.length} project files\n`);

  // 10. Seed Video Reviews
  console.log('🎬 Seeding video reviews...');
  const reviewMap = new Map();

  for (const reviewData of seedData.videoReviews) {
    const review = await prisma.videoReview.create({
      data: {
        projectId: projectMap.get(reviewData.projectId),
        userId: user.id,
        title: reviewData.title,
        description: reviewData.description,
        status: reviewData.status,
        videoUrl: reviewData.videoUrl,
        shareToken: reviewData.shareToken,
      }
    });

    reviewMap.set(reviewData.id, review.id);
  }
  console.log(`✅ Created ${seedData.videoReviews.length} video reviews\n`);

  // 11. Seed Video Comments
  console.log('💭 Seeding video comments...');

  for (const commentData of seedData.videoComments) {
    await prisma.videoComment.create({
      data: {
        reviewId: reviewMap.get(commentData.reviewId),
        userId: user.id,
        authorName: commentData.authorName,
        timestampSeconds: commentData.timestampSeconds,
        comment: commentData.comment,
        annotations: JSON.stringify(commentData.annotations || []),
        resolved: Boolean(commentData.resolved),
      }
    });
  }
  console.log(`✅ Created ${seedData.videoComments.length} video comments\n`);

  // 12. Seed Collaborators
  console.log('👷 Seeding collaborators...');

  for (const collabData of seedData.collaborators) {
    await prisma.collaborator.create({
      data: {
        userId: user.id,
        name: collabData.name,
        email: collabData.email,
        role: collabData.role,
        phone: collabData.phone,
        skills: collabData.skills,
        dailyRate: collabData.dailyRate,
        status: collabData.status,
      }
    });
  }
  console.log(`✅ Created ${seedData.collaborators.length} collaborators\n`);

  // 13. Seed Project States (IA tool states)
  console.log('🤖 Seeding project states...');

  for (const stateData of seedData.projectStates) {
    await prisma.projectState.create({
      data: {
        projectId: projectMap.get(stateData.projectId),
        toolId: stateData.toolId,
        formData: JSON.stringify(stateData.formData),
      }
    });
  }
  console.log(`✅ Created ${seedData.projectStates.length} project states\n`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('🎉 SEED APLICADO COM SUCESSO!\n');
  console.log('📊 Resumo:');
  console.log(`   👤 Usuário: ${user.name} (${user.email})`);
  console.log(`   👥 Clientes: ${clientMap.size}`);
  console.log(`   📁 Projetos: ${projectMap.size}`);
  console.log(`   💼 Oportunidades: ${seedData.opportunities.length}`);
  console.log(`   💬 Interações: ${seedData.interactions.length}`);
  console.log(`   💰 Lançamentos: ${seedData.financialEntries.length}`);
  console.log(`   📎 Arquivos: ${seedData.projectFiles.length}`);
  console.log(`   🎬 Video Reviews: ${reviewMap.size}`);
  console.log(`   💭 Comentários: ${seedData.videoComments.length}`);
  console.log(`   👷 Colaboradores: ${seedData.collaborators.length}`);
  console.log(`   🤖 Estados IA: ${seedData.projectStates.length}`);
  console.log('\n✨ Plataforma 100% preenchida para apresentação!');
  console.log(`🔗 Acesse: http://localhost:5173\n`);
  console.log('='.repeat(80) + '\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Erro ao aplicar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
