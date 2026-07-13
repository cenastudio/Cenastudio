#!/usr/bin/env node
/**
 * Reset Failed Migration
 * Marks the failed migration as rolled back so prisma migrate deploy can retry
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetFailedMigration() {
  try {
    console.log('🔧 Checking for failed migration...');

    // Check if migration exists and is failed
    const failedMigration = await prisma.$queryRaw`
      SELECT migration_name, started_at, finished_at
      FROM "_prisma_migrations"
      WHERE migration_name = '20260713_shotlist_complete'
      AND finished_at IS NULL
      LIMIT 1
    `;

    if (failedMigration.length === 0) {
      console.log('✅ No failed migration found.');
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log('⚠️  Found failed migration: 20260713_shotlist_complete');
    console.log('📝 Marking as rolled back...');

    // Mark as rolled back
    await prisma.$executeRaw`
      UPDATE "_prisma_migrations"
      SET finished_at = NOW(),
          applied_steps_count = 0,
          logs = 'Manually rolled back - PostgreSQL syntax fixed'
      WHERE migration_name = '20260713_shotlist_complete'
      AND finished_at IS NULL
    `;

    console.log('✅ Migration marked as rolled back!');
    console.log('🚀 Prisma migrate deploy will now apply the corrected migration...');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

resetFailedMigration();
