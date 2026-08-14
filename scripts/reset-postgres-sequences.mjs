import "dotenv/config";
import pg from "pg";

const databaseUrl =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error("Set SUPABASE_DATABASE_URL or DATABASE_URL before running this script.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});

await client.connect();

const sequences = await client.query(`
  select
    table_schema,
    table_name,
    column_name,
    pg_get_serial_sequence(format('%I.%I', table_schema, table_name), column_name) as sequence_name
  from information_schema.columns
  where table_schema = 'public'
    and column_name = 'id'
    and pg_get_serial_sequence(format('%I.%I', table_schema, table_name), column_name) is not null
  order by table_name
`);

const results = [];

for (const row of sequences.rows) {
  const tableName = `"${row.table_schema}"."${row.table_name}"`;
  const columnName = `"${row.column_name}"`;
  const result = await client.query(
    `
      select setval(
        $1,
        greatest(coalesce((select max(${columnName}) from ${tableName}), 0), 1),
        coalesce((select max(${columnName}) from ${tableName}), 0) > 0
      ) as value
    `,
    [row.sequence_name],
  );

  results.push({
    table: row.table_name,
    sequence: row.sequence_name,
    value: result.rows[0].value,
  });
}

await client.end();

console.log(JSON.stringify({ ok: true, sequences: results }, null, 2));
