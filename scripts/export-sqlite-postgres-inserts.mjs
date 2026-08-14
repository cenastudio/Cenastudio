import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const sourcePath = process.env.SQLITE_SOURCE || "data/frame.db";
const schemaPath = process.env.SUPABASE_SCHEMA_SQL || "tmp/supabase-prisma-schema.clean.sql";
const outputPath = process.env.POSTGRES_IMPORT_SQL || "tmp/supabase-migration/sqlite-data-import.sql";

if (!fs.existsSync(sourcePath)) throw new Error(`SQLite source not found: ${sourcePath}`);
if (!fs.existsSync(schemaPath)) throw new Error(`Schema SQL not found: ${schemaPath}`);

const schemaSql = fs.readFileSync(schemaPath, "utf8");
const db = new Database(sourcePath, { readonly: true });

const preferredOrder = [
  "users",
  "plans",
  "tools",
  "workspaces",
  "workspace_members",
  "clients",
  "projects",
  "opportunities",
  "interactions",
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

function quoteIdent(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function parseTargetSchema(sql) {
  const tables = new Map();
  const tableRegex = /CREATE TABLE "([^"]+)" \(([\s\S]*?)\n\);/g;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(sql))) {
    const [, table, body] = tableMatch;
    const columns = new Map();
    for (const line of body.split("\n")) {
      const match = line.trim().match(/^"([^"]+)"\s+([A-Z][A-Z\s]*(?:\([^)]*\))?)/);
      if (!match) continue;
      const [, column, rawType] = match;
      columns.set(column, {
        type: rawType.trim().toUpperCase(),
        hasDefault: /\sDEFAULT\s/i.test(line),
        isNotNull: /\sNOT NULL\s/i.test(line),
      });
    }
    tables.set(table, columns);
  }
  return tables;
}

function sqliteTableSet() {
  return new Set(
    db.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%'")
      .all()
      .map((row) => row.name),
  );
}

function sqliteColumns(table) {
  return db.prepare(`pragma table_info(${quoteIdent(table)})`).all().map((row) => row.name);
}

function sqlValue(value, targetColumn) {
  if (value === null || value === undefined) {
    return targetColumn.isNotNull && targetColumn.hasDefault ? "DEFAULT" : "NULL";
  }
  const targetType = targetColumn.type;
  if (targetType === "BOOLEAN") return value === 1 || value === true || value === "true" ? "TRUE" : "FALSE";
  if (targetType === "JSONB") {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    JSON.parse(text);
    return `${quoteLiteral(text)}::jsonb`;
  }
  if (targetType === "INTEGER" || targetType === "BIGINT" || targetType === "DOUBLE PRECISION") {
    return Number.isFinite(Number(value)) ? String(value) : "NULL";
  }
  return quoteLiteral(value);
}

const targetSchema = parseTargetSchema(schemaSql);
const sqliteTables = sqliteTableSet();
const lines = [
  "BEGIN;",
  "SET session_replication_role = replica;",
];
const summary = [];

for (const table of preferredOrder) {
  if (!sqliteTables.has(table) || !targetSchema.has(table)) continue;

  const sourceColumns = sqliteColumns(table);
  const targetColumns = targetSchema.get(table);
  const columns = [...targetColumns.keys()].filter((column) => sourceColumns.includes(column));
  if (!columns.length) continue;

  const rows = db.prepare(`select ${columns.map(quoteIdent).join(", ")} from ${quoteIdent(table)}`).all();
  summary.push({ table, rows: rows.length, columns });
  if (!rows.length) continue;

  lines.push(`-- ${table}: ${rows.length} rows`);
  for (const row of rows) {
    const values = columns.map((column) => sqlValue(row[column], targetColumns.get(column)));
    lines.push(
      `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")}) VALUES (${values.join(", ")}) ON CONFLICT DO NOTHING;`,
    );
  }

  const idColumn = targetColumns.get("id");
  if (columns.includes("id") && idColumn && ["BIGINT", "INTEGER"].includes(idColumn.type)) {
    lines.push(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${quoteIdent(table)}), 1), true);`,
    );
  }
}

lines.push("SET session_replication_role = origin;");
lines.push("COMMIT;");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
fs.writeFileSync(path.join(path.dirname(outputPath), "sqlite-data-import-summary.json"), JSON.stringify(summary, null, 2));
console.log(`Wrote ${outputPath}`);
console.log(JSON.stringify(summary.map(({ table, rows }) => ({ table, rows })), null, 2));
db.close();
