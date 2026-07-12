#!/usr/bin/env tsx
/**
 * Migração: Collaborator (freelancer sem login) → Team (User + WorkspaceMember)
 * Spec: team-task-delegation, Fase 5.
 *
 * NÃO-DESTRUTIVO. Este script:
 *   1. Faz dump JSON de todos os `collaborators` ANTES de qualquer alteração
 *      (.private/migrations/collaborators-dump-<ts>.json).
 *   2. Para cada collaborator elegível, cria (ou vincula, se o email já for
 *      um User) um User + WorkspaceMember no workspace do dono original.
 *   3. Gera relatório (migrados / pulados / revisão manual) em
 *      .private/migrations/collaborators-migration-report-<ts>.json.
 *
 * NÃO deleta nada da tabela `collaborators` — isso é a Fase 6, separada e
 * com autorização explícita. `/collaborators` continua funcionando normal
 * enquanto esta fase roda.
 *
 * USO:
 *   Dry-run (padrão, não grava nada no banco, só relatório):
 *     npx tsx scripts/migrate-collaborators-to-team.ts
 *   Execução real (grava Users/WorkspaceMembers):
 *     npx tsx scripts/migrate-collaborators-to-team.ts --apply
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { mapCollaboratorRole } from '../server/lib/collaboratorRoleMap.js';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrado no .env');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const MAX_TEAM_MEMBERS_STUDIO = 5;

function getPostgresRuntimeConfig(url: string) {
  try {
    const parsed = new URL(url);
    const usesSupabase = parsed.hostname.endsWith('.supabase.com') || parsed.hostname.endsWith('.supabase.co');
    if (usesSupabase) {
      parsed.searchParams.delete('sslmode');
      return { connectionString: parsed.toString(), ssl: { rejectUnauthorized: false } as const };
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

interface ReportEntry {
  collaboratorId: number;
  name: string;
  email: string;
  freeRole: string;
  outcome: string;
  detail?: string;
}

async function ensureWorkspaceId(ownerId: bigint, ownerName: string | null, ownerEmail: string): Promise<number | null> {
  const existing = await (prisma as any).workspaceMember.findFirst({
    where: { userId: ownerId, status: 'active' },
    include: { workspace: true },
    orderBy: { id: 'asc' },
  });
  if (existing?.workspace) return Number(existing.workspace.id);

  const ownerWorkspace = await prisma.workspace.findFirst({ where: { ownerUserId: ownerId }, select: { id: true } });
  if (ownerWorkspace) return Number(ownerWorkspace.id);

  if (!APPLY) return -1; // dry-run: sinaliza que criaria um workspace

  const created = await prisma.workspace.create({
    data: {
      name: ownerName?.trim() || ownerEmail.split('@')[0] || 'Meu Studio',
      type: 'solo',
      ownerUserId: ownerId,
      members: { create: { userId: ownerId, role: 'owner', status: 'active', acceptedAt: new Date() } },
    },
  });
  return Number(created.id);
}

async function activeMemberCount(workspaceId: number): Promise<number> {
  return await (prisma as any).workspaceMember.count({
    where: { workspaceId: BigInt(workspaceId), role: { not: 'owner' }, status: 'active' },
  });
}

async function main() {
  console.log(`\n🔄 MIGRAÇÃO Collaborator → Team  (${APPLY ? 'APPLY — grava no banco' : 'DRY-RUN — nada será gravado'})\n`);
  console.log(`📊 Banco: ${databaseUrl!.substring(0, 55)}...\n`);

  const collaborators = await prisma.collaborator.findMany({ orderBy: { id: 'asc' } });
  console.log(`Encontrados ${collaborators.length} colaboradores.\n`);

  // 1. Dump ANTES de tudo (sempre, mesmo em dry-run).
  const migrationsDir = path.resolve(process.cwd(), '.private', 'migrations');
  fs.mkdirSync(migrationsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dumpPath = path.join(migrationsDir, `collaborators-dump-${ts}.json`);
  fs.writeFileSync(
    dumpPath,
    JSON.stringify(collaborators, (_k, v) => (typeof v === 'bigint' ? Number(v) : v), 2),
  );
  console.log(`💾 Dump salvo: ${dumpPath}\n`);

  if (collaborators.length === 0) {
    console.log('Nada a migrar. Encerrando.');
    await prisma.$disconnect();
    return;
  }

  if (APPLY) {
    const ok = await askConfirmation('Confirma execução REAL (cria Users/WorkspaceMembers)? (y/N): ');
    if (!ok) {
      console.log('Abortado pelo usuário.');
      await prisma.$disconnect();
      return;
    }
  }

  const report: { migrated: ReportEntry[]; linked: ReportEntry[]; skipped: ReportEntry[]; reviewNeeded: ReportEntry[] } = {
    migrated: [],
    linked: [],
    skipped: [],
    reviewNeeded: [],
  };

  for (const collab of collaborators) {
    const email = (collab.email || '').toLowerCase().trim();
    const base: ReportEntry = {
      collaboratorId: Number(collab.id),
      name: collab.name,
      email,
      freeRole: collab.role,
      outcome: '',
    };

    if (!EMAIL_RE.test(email)) {
      report.skipped.push({ ...base, outcome: 'skipped', detail: 'email inválido/ausente' });
      continue;
    }

    const owner = await prisma.user.findUnique({
      where: { id: collab.userId },
      select: { id: true, name: true, email: true },
    });
    if (!owner) {
      report.skipped.push({ ...base, outcome: 'skipped', detail: 'dono do collaborator não existe mais' });
      continue;
    }

    const workspaceId = await ensureWorkspaceId(owner.id, owner.name, owner.email);
    if (workspaceId === null) {
      report.skipped.push({ ...base, outcome: 'skipped', detail: 'sem workspace para o dono' });
      continue;
    }

    const { role, needsReview } = mapCollaboratorRole(collab.role);

    // Email já é um User? Só vincular (se ainda não vinculado).
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      const alreadyMember =
        workspaceId > 0 &&
        (await (prisma as any).workspaceMember.findFirst({
          where: { workspaceId: BigInt(workspaceId), userId: existingUser.id },
        }));
      if (alreadyMember) {
        report.linked.push({ ...base, outcome: 'already-member', detail: `user ${Number(existingUser.id)} já no workspace` });
      } else {
        if (APPLY && workspaceId > 0) {
          const count = await activeMemberCount(workspaceId);
          if (count >= MAX_TEAM_MEMBERS_STUDIO) {
            report.skipped.push({ ...base, outcome: 'skipped', detail: `capacidade (${count}/${MAX_TEAM_MEMBERS_STUDIO})` });
            continue;
          }
          await (prisma as any).workspaceMember.create({
            data: { workspaceId: BigInt(workspaceId), userId: existingUser.id, role, status: 'active', acceptedAt: new Date() },
          });
        }
        const entry = { ...base, outcome: 'linked-existing-user', detail: `user ${Number(existingUser.id)} → role ${role}` };
        report.linked.push(entry);
        if (needsReview) report.reviewNeeded.push(entry);
      }
      continue;
    }

    // Email novo → criar User + WorkspaceMember.
    if (APPLY && workspaceId > 0) {
      const count = await activeMemberCount(workspaceId);
      if (count >= MAX_TEAM_MEMBERS_STUDIO) {
        report.skipped.push({ ...base, outcome: 'skipped', detail: `capacidade (${count}/${MAX_TEAM_MEMBERS_STUDIO})` });
        continue;
      }
      const passwordHash = bcrypt.hashSync(randomPassword(), 12);
      const newUser = await prisma.user.create({
        data: { name: collab.name.trim(), email, passwordHash, role: 'user', emailVerified: true, mustResetPassword: true },
      });
      await (prisma as any).workspaceMember.create({
        data: { workspaceId: BigInt(workspaceId), userId: newUser.id, role, status: 'active', acceptedAt: new Date() },
      });
    }
    const entry = { ...base, outcome: 'migrated-new-user', detail: `role ${role}` };
    report.migrated.push(entry);
    if (needsReview) report.reviewNeeded.push(entry);
  }

  // 2. Relatório.
  const reportPath = path.join(migrationsDir, `collaborators-migration-report-${ts}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({ apply: APPLY, generatedAt: ts, report }, null, 2));

  console.log('\n──────── RESULTADO ────────');
  console.log(`  Migrados (novo user):     ${report.migrated.length}`);
  console.log(`  Vinculados (user já existia): ${report.linked.length}`);
  console.log(`  Pulados:                  ${report.skipped.length}`);
  console.log(`  Precisam revisão manual:  ${report.reviewNeeded.length}`);
  console.log(`\n📄 Relatório completo: ${reportPath}`);
  if (!APPLY) console.log('\n⚠️  DRY-RUN — nada foi gravado no banco. Rode com --apply para executar de verdade.');
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Erro na migração:', err);
  await prisma.$disconnect();
  process.exit(1);
});
