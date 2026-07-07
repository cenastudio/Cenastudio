#!/usr/bin/env tsx
/**
 * Clean Test Users
 *
 * Remove TODOS usuários de teste/QA do banco
 * Mantém apenas admins reais de produção
 *
 * USO: npx tsx scripts/clean-test-users.ts
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
  console.log('\n🧹 LIMPEZA DE USUÁRIOS DE TESTE\n');

  // Buscar todos usuários
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true }
  });

  console.log(`📊 Total de usuários no banco: ${allUsers.length}\n`);

  // Definir emails que devem ser MANTIDOS (admins reais)
  const keepEmails = [
    'admin@cenastudio.com.br',
    'elytraprod@gmail.com',
    'doesnotzero@cenastudio.com.br'
  ];

  // Identificar usuários a manter
  const keepUsers = allUsers.filter(u => keepEmails.includes(u.email));

  // Identificar usuários a deletar
  const deleteUsers = allUsers.filter(u => !keepEmails.includes(u.email));

  console.log('✅ Usuários a MANTER (admins reais):');
  keepUsers.forEach(u => {
    console.log(`   - ${u.email} (${u.name}) - ${u.role}`);
  });

  console.log('\n❌ Usuários a DELETAR (teste/QA):');
  deleteUsers.forEach(u => {
    console.log(`   - ${u.email} (${u.name}) - ${u.role}`);
  });

  console.log(`\n📊 Total a deletar: ${deleteUsers.length}\n`);

  const confirmed = await askConfirmation('Confirma deleção dos usuários de teste? (y/N): ');

  if (!confirmed) {
    console.log('\n❌ Operação cancelada pelo usuário');
    process.exit(0);
  }

  console.log('\n🗑️  Deletando usuários de teste...\n');

  // Deletar apenas os usuários de teste (mantém os 3 admins)
  const deleted = await prisma.user.deleteMany({
    where: {
      email: {
        notIn: keepEmails
      }
    }
  });

  console.log(`✅ ${deleted.count} usuários deletados\n`);

  // Verificar resultado final
  const finalUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true }
  });

  console.log('👤 Usuários restantes no banco:');
  finalUsers.forEach(u => {
    console.log(`   - ${u.email} (${u.name}) - ${u.role}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎉 LIMPEZA DE USUÁRIOS CONCLUÍDA!');
  console.log('='.repeat(80));
  console.log(`\n✅ ${finalUsers.length} usuários mantidos (apenas admins reais)`);
  console.log('✅ Banco pronto para produção!\n');
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
