import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "prisma/migrations/20260822013000_link_proposals_to_budget/migration.sql"),
  "utf8",
);

describe("proposal source-link migration", () => {
  it("adds source columns without rewriting existing public proposals", () => {
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "project_id" BIGINT');
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "source_budget_id" BIGINT');
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "source_generation_id" BIGINT');
    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS "commercial_snapshot" JSONB');
    expect(migrationSql).toContain("No historical link is inferred");
    expect(migrationSql).not.toMatch(/\bUPDATE\s+"proposals"\b/i);
    expect(migrationSql).not.toMatch(/\bALTER\s+TABLE\s+"proposals"\s+DROP\b/i);
  });

  it("keeps constraints and indexes idempotent for repeated deploy attempts", () => {
    for (const constraint of [
      "proposals_project_id_fkey",
      "proposals_source_budget_id_fkey",
      "proposals_source_generation_id_fkey",
    ]) {
      expect(migrationSql).toContain(`conname = '${constraint}'`);
    }

    expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS "idx_proposals_project_id"');
    expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS "idx_proposals_source_budget_id"');
    expect(migrationSql).toContain('CREATE INDEX IF NOT EXISTS "idx_proposals_source_generation_id"');
  });
});
