import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import pg from "pg";

const { Client } = pg;

const sourcePath = process.env.SQLITE_SOURCE || "data/frame.db";
const schemaPath = process.env.SUPABASE_SCHEMA_SQL || "tmp/supabase-prisma-schema.clean.sql";
const targetUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!targetUrl) {
  console.error("Set SUPABASE_DATABASE_URL with the Supabase Postgres connection string.");
  process.exit(1);
}

if (!fs.existsSync(sourcePath)) {
  console.error(`SQLite source not found: ${sourcePath}`);
  process.exit(1);
}

const sqlite = new Database(sourcePath, { readonly: true });
const clientConnectionString = targetUrl
  .replace(/[?&]sslmode=[^&]+/g, "")
  .replace(/[?&]pgbouncer=[^&]+/g, "");
const pgClient = new Client({
  connectionString: clientConnectionString,
  ssl: targetUrl.includes("supabase.co") || targetUrl.includes("supabase.com") || targetUrl.includes("pooler.supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

const orderedTables = [
  "users",
  "plans",
  "tools",
  "workspaces",
  "workspace_members",
  "clients",
  "projects",
  "opportunities",
  "interactions",
  "collaborators",
  "project_members",
  "files",
  "video_reviews",
  "video_comments",
  "notifications",
  "financial_entries",
  "studio_settings",
  "subscriptions",
  "usage",
  "reset_tokens",
  "user_sessions",
  "webhooks",
  "webhook_deliveries",
  "client_portal_access",
  "budgets",
  "budget_entries",
  "dre_settings",
  "equipment",
  "equipment_bookings",
  "shot_lists",
  "shots",
  "tasks",
  "time_entries",
  "admin_actions",
];

function quoteIdent(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function sqliteTables() {
  return new Set(
    sqlite
      .prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%'")
      .all()
      .map((row) => row.name),
  );
}

function sqliteColumns(table) {
  return sqlite.prepare(`pragma table_info(${quoteIdent(table)})`).all().map((row) => row.name);
}

async function pgColumns(table) {
  const result = await pgClient.query(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [table],
  );
  return result.rows.map((row) => row.column_name);
}

function normalizeValue(value) {
  if (value === undefined) return null;
  return value;
}

async function ensureSchema() {
  const hasUsers = await pgClient.query("select to_regclass('public.users') as table_name");
  if (hasUsers.rows[0]?.table_name) return;
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema SQL not found: ${schemaPath}`);
  }
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pgClient.query(sql);
}

async function importTable(table, availableSqliteTables) {
  if (!availableSqliteTables.has(table)) return { table, skipped: "missing_source", count: 0 };

  const sourceColumns = sqliteColumns(table);
  const targetColumns = await pgColumns(table);
  if (!targetColumns.length) return { table, skipped: "missing_target", count: 0 };

  const columns = targetColumns.filter((column) => sourceColumns.includes(column));
  if (!columns.length) return { table, skipped: "no_common_columns", count: 0 };

  const rows = sqlite.prepare(`select ${columns.map(quoteIdent).join(", ")} from ${quoteIdent(table)}`).all();
  if (!rows.length) return { table, skipped: "empty", count: 0 };

  await pgClient.query("begin");
  try {
    for (const row of rows) {
      const values = columns.map((column) => normalizeValue(row[column]));
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const updates = columns
        .filter((column) => column !== "id" && column !== "user_id")
        .map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`);
      const conflict = columns.includes("id")
        ? ` on conflict (${quoteIdent("id")}) do ${updates.length ? `update set ${updates.join(", ")}` : "nothing"}`
        : " on conflict do nothing";
      await pgClient.query(
        `insert into ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")}) values (${placeholders})${conflict}`,
        values,
      );
    }
    await pgClient.query("commit");
  } catch (error) {
    await pgClient.query("rollback");
    throw new Error(`${table}: ${error.message}`);
  }

  if (columns.includes("id")) {
    await pgClient.query(
      `select setval(pg_get_serial_sequence($1, 'id'), coalesce((select max(id) from ${quoteIdent(table)}), 1), true)`,
      [table],
    );
  }

  return { table, count: rows.length };
}

async function main() {
  await pgClient.connect();
  try {
    await ensureSchema();
    const availableSqliteTables = sqliteTables();
    const results = [];
    for (const table of orderedTables) {
      results.push(await importTable(table, availableSqliteTables));
    }
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await pgClient.end();
    sqlite.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
