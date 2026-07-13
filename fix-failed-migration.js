#!/usr/bin/env node
/**
 * Fix Failed Migration Script
 *
 * This script fixes the P3009 error by marking the failed migration as rolled back
 * It will be executed by Railway before starting the server
 */

const { PrismaClient } = require('@prisma/client');

async function fixFailedMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Checking for failed migrations...');

    // Check if the migration exists and is failed
    const failedMigration = await prisma.$queryRaw`
      SELECT migration_name, started_at, finished_at
      FROM "_prisma_migrations"
      WHERE migration_name = '20260713_shotlist_complete'
      AND finished_at IS NULL
      LIMIT 1
    `;

    if (failedMigration.length === 0) {
      console.log('✅ No failed migration found. Proceeding with normal deployment.');
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log('⚠️  Found failed migration: 20260713_shotlist_complete');
    console.log('📝 Marking as rolled back...');

    // Mark the migration as rolled back
    await prisma.$executeRaw`
      UPDATE "_prisma_migrations"
      SET finished_at = NOW(),
          applied_steps_count = 0,
          logs = 'Manually rolled back due to P3009 error - PostgreSQL does not support IF NOT EXISTS on ALTER TABLE ADD CONSTRAINT. Migration was corrected and will be reapplied.'
      WHERE migration_name = '20260713_shotlist_complete'
      AND finished_at IS NULL
    `;

    console.log('✅ Migration marked as rolled back successfully!');
    console.log('🚀 Prisma migrate deploy will now apply the corrected migration...');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing migration:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixFailedMigration();
