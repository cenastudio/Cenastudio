#!/usr/bin/env tsx
/**
 * Clean Production Data
 *
 * Remove TODOS os dados demo/test do banco
 * Mantém apenas: estrutura, planos, tools, admins reais
 *
 * USO: npx tsx scripts/clean-production-data.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as readline from 'readline';

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

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  console.log('\n🚨 LIMPEZA DE DADOS DE PRODUÇÃO\n');
  console.log('⚠️  Este script VAI DELETAR:');
  console.log('   - TODOS os clientes');
  console.log('   - TODOS os projetos');
  console.log('   - TODAS as oportunidades');
  console.log('   - TODAS as interações');
  console.log('   - TODOS os lançamentos financeiros');
  console.log('   - TODOS os arquivos');
  console.log('   - TODOS os video reviews');
  console.log('   - TODOS os comentários');
  console.log('   - TODOS os colaboradores');
  console.log('   - Usuários demo/test');
  console.log('\n✅ Este script VAI MANTER:');
  console.log('   - Estrutura do banco (tabelas, colunas)');
  console.log('   - Planos (free, pro, studio)');
  console.log('   - Tools (12 ferramentas IA)');
  console.log('   - Admins reais (elytraprod, doesnotzero, admin)');
  console.log('\n📊 Banco conectado:');
  console.log(`   ${databaseUrl.substring(0, 60)}...\n`);

  const confirmed = await askConfirmation('Tem certeza que quer continuar? (y/N): ');

  if (!confirmed) {
    console.log('\n❌ Operação cancelada pelo usuário');
    process.exit(0);
  }

  console.log('\n🧹 Iniciando limpeza...\n');

  // 1. Video Comments
  console.log('💭 Deletando comentários...');
  const comments = await prisma.videoComment.deleteMany();
  console.log(`   ✓ ${comments.count} comentários deletados`);

  // 2. Video Reviews
  console.log('🎬 Deletando video reviews...');
  const reviews = await prisma.videoReview.deleteMany();
  console.log(`   ✓ ${reviews.count} reviews deletados`);

  // 3. Project States
  console.log('🤖 Deletando estados IA...');
  const states = await prisma.projectState.deleteMany();
  console.log(`   ✓ ${states.count} estados deletados`);

  // 4. Files
  console.log('📎 Deletando arquivos...');
  const files = await prisma.file.deleteMany();
  console.log(`   ✓ ${files.count} arquivos deletados`);

  // 5. Notifications
  console.log('🔔 Deletando notificações...');
  const notifications = await prisma.notification.deleteMany();
  console.log(`   ✓ ${notifications.count} notificações deletadas`);

  // 6. Financial Entries
  console.log('💰 Deletando lançamentos financeiros...');
  const financial = await prisma.financialEntry.deleteMany();
  console.log(`   ✓ ${financial.count} lançamentos deletados`);

  // 7. Interactions
  console.log('💬 Deletando interações...');
  const interactions = await prisma.interaction.deleteMany();
  console.log(`   ✓ ${interactions.count} interações deletadas`);

  // 8. Opportunities
  console.log('💼 Deletando oportunidades...');
  const opportunities = await prisma.opportunity.deleteMany();
  console.log(`   ✓ ${opportunities.count} oportunidades deletadas`);

  // 9. Collaborators
  console.log('👷 Deletando colaboradores...');
  const collaborators = await prisma.collaborator.deleteMany();
  console.log(`   ✓ ${collaborators.count} colaboradores deletados`);

  // 10. Projects
  console.log('📁 Deletando projetos...');
  const projects = await prisma.project.deleteMany();
  console.log(`   ✓ ${projects.count} projetos deletados`);

  // 11. Clients
  console.log('👥 Deletando clientes...');
  const clients = await prisma.client.deleteMany();
  console.log(`   ✓ ${clients.count} clientes deletados`);

  // 12. Demo Users
  console.log('🗑️  Deletando usuários demo...');
  const demoUsers = await prisma.user.deleteMany({
    where: {
      email: {
        in: ['demo@cenastudio.com.br']
      }
    }
  });
  console.log(`   ✓ ${demoUsers.count} usuários demo deletados`);

  // Verificar o que sobrou
  console.log('\n📊 Verificando dados restantes...\n');

  const remainingUsers = await prisma.user.count();
  const remainingPlans = await prisma.plan.count();
  const remainingTools = await prisma.tool.count();

  console.log('✅ Dados mantidos:');
  console.log(`   - ${remainingUsers} usuários (admins)`);
  console.log(`   - ${remainingPlans} planos`);
  console.log(`   - ${remainingTools} ferramentas IA`);

  // Listar usuários restantes
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true }
  });

  console.log('\n👤 Usuários no banco:');
  users.forEach(u => {
    console.log(`   - ${u.email} (${u.name}) - ${u.role}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎉 LIMPEZA CONCLUÍDA COM SUCESSO!');
  console.log('='.repeat(80));
  console.log('\n✅ Banco está limpo e pronto para produção!');
  console.log('✅ Apenas estrutura, planos, tools e admins mantidos');
  console.log('✅ Nenhum dado demo ou de teste no banco\n');
}

main()
  .catch((error) => {
    console.error('\n❌ Erro durante limpeza:', error.message);
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
