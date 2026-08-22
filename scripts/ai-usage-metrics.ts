import { TOOLS } from "../shared/tools.js";
import { prisma, shouldUsePrisma } from "../server/models/prisma.js";

interface UsageMetricRow {
  tool_id: string | null;
  total_generations: bigint;
  users_count: bigint;
  generations_last_30d: bigint;
  last_generation_at: Date | null;
}

interface ReuseMetricRow {
  tool_id: string | null;
  reused_count: bigint;
}

function percent(numerator: number, denominator: number) {
  if (denominator === 0) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

async function main() {
  if (!shouldUsePrisma) {
    console.error("DATABASE_URL/SUPABASE_DATABASE_URL ausente. Rode com acesso ao Postgres de staging/producao.");
    process.exitCode = 1;
    return;
  }

  const [usageRows, reuseRows] = await Promise.all([
    prisma.$queryRaw<UsageMetricRow[]>`
      SELECT
        tool_id,
        COUNT(*)::bigint AS total_generations,
        COUNT(DISTINCT user_id)::bigint AS users_count,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::bigint AS generations_last_30d,
        MAX(created_at) AS last_generation_at
      FROM generations
      GROUP BY tool_id
      ORDER BY total_generations DESC
    `,
    prisma.$queryRaw<ReuseMetricRow[]>`
      SELECT
        g.tool_id,
        COUNT(DISTINCT p.id)::bigint AS reused_count
      FROM proposals p
      JOIN generations g ON g.id = p.source_generation_id
      WHERE p.source_generation_id IS NOT NULL
      GROUP BY g.tool_id
    `,
  ]);

  const reuseByTool = new Map(reuseRows.map((row) => [row.tool_id ?? "unknown", Number(row.reused_count)]));
  const nameByTool = new Map(TOOLS.map((tool) => [tool.id, tool.name]));
  const rows = usageRows.map((row) => {
    const toolId = row.tool_id ?? "unknown";
    const total = Number(row.total_generations);
    const reused = reuseByTool.get(toolId) ?? 0;
    return {
      tool: toolId,
      name: nameByTool.get(toolId) ?? "Ferramenta desconhecida",
      total,
      last30d: Number(row.generations_last_30d),
      users: Number(row.users_count),
      reused,
      reuseRate: percent(reused, total),
      averageRating: null,
      lastGenerationAt: row.last_generation_at?.toISOString() ?? null,
    };
  });

  const highVolumeLowReuse = rows
    .filter((row) => row.total >= 10 && row.reused / Math.max(row.total, 1) < 0.15)
    .map((row) => ({ tool: row.tool, name: row.name, total: row.total, reuseRate: row.reuseRate }));

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
    note: "averageRating=null porque o schema atual ainda nao registra rating/feedback de geracoes.",
    rows,
    highVolumeLowReuse,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
