/**
 * Seed Charts Data — Cena Studio
 *
 * Popula dados históricos para fazer TODOS os gráficos funcionarem:
 * - Comercial: Revenue chart (12 meses), Funnel, Forecast
 * - Financeiro: Cashflow (6 meses)
 *
 * Executar: npx tsx scripts/seed-charts-data.ts
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "frame.db");

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const admin = db.prepare("SELECT id FROM users WHERE email = 'admin@cenastudio.com.br'").get() as { id: number } | undefined;
if (!admin) { console.error("❌ Admin not found"); process.exit(1); }
const userId = admin.id;

// Get client IDs
const allClients = db.prepare("SELECT id, name FROM clients WHERE user_id = ?").all(userId) as { id: number; name: string }[];
const clientA = allClients[0]?.id || null; // Atlântica
const clientB = allClients[1]?.id || null; // TechXYZ
const clientC = allClients[2]?.id || null; // Harmonia

console.log(`✅ Admin id: ${userId}, Clients: ${allClients.length}\n`);

// ─── CLEAR OLD FINANCIAL DATA (to avoid duplicates) ───
db.prepare("DELETE FROM financial_entries WHERE user_id = ?").run(userId);
console.log("🗑️  Cleared old financial entries");

// ─── FINANCIAL ENTRIES: 12 months of income + expenses ───
const insertEntry = db.prepare(`
  INSERT INTO financial_entries (user_id, client_id, kind, description, category, amount, status, due_date, paid_at, recurrence, is_fixed, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, 'settled', ?, ?, ?, ?, ?, ?)
`);

// Generate 12 months of revenue data
const now = new Date();
const months: { start: string; end: string; label: string }[] = [];
for (let i = 11; i >= 0; i--) {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
  const start = d.toISOString().slice(0, 10);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  months.push({ start, end, label });
}

// Revenue per month (varying amounts to make chart interesting)
const monthlyRevenue = [4500, 8200, 6800, 12000, 9500, 15000, 11200, 18500, 14000, 22000, 16800, 20500];
const monthlyExpenses = [3200, 4100, 3800, 5500, 4200, 6800, 5100, 7200, 6000, 8500, 7100, 9430];

let entryCount = 0;
months.forEach((month, i) => {
  const revenue = monthlyRevenue[i];
  const expenses = monthlyExpenses[i];
  const midMonth = `${month.start.slice(0, 8)}15`;
  const paidDate = `${midMonth} 10:00:00`;
  const createdAt = `${month.start} 09:00:00`;

  // Income entries (split into 2-3 per month for realism)
  const incomeA = Math.round(revenue * 0.6);
  const incomeB = revenue - incomeA;

  insertEntry.run(userId, clientB, "income", `TechXYZ — Retainer ${month.label}`, "projeto", incomeA, midMonth, paidDate, "monthly", 0, createdAt, createdAt);
  insertEntry.run(userId, clientA, "income", `Atlântica — Job ${month.label}`, "projeto", incomeB, midMonth, paidDate, "once", 0, createdAt, createdAt);
  entryCount += 2;

  // Expense entries
  const expSoftware = 530;
  const expTeam = Math.round((expenses - expSoftware) * 0.6);
  const expStructure = expenses - expSoftware - expTeam;

  insertEntry.run(userId, null, "expense", `Software mensal — ${month.label}`, "software", expSoftware, month.start, `${month.start} 08:00:00`, "monthly", 1, createdAt, createdAt);
  insertEntry.run(userId, null, "expense", `Equipe/freelancers — ${month.label}`, "equipe", expTeam, midMonth, paidDate, "once", 0, createdAt, createdAt);
  insertEntry.run(userId, null, "expense", `Estrutura — ${month.label}`, "estrutura", expStructure, month.start, `${month.start} 09:00:00`, "monthly", 1, createdAt, createdAt);
  entryCount += 3;
});

// Add pending entries for current/next month
const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().slice(0, 10);
db.prepare(`
  INSERT INTO financial_entries (user_id, client_id, kind, description, category, amount, status, due_date, recurrence, is_fixed, created_at, updated_at)
  VALUES (?, ?, 'income', ?, 'projeto', ?, 'pending', ?, 'once', 0, datetime('now'), datetime('now'))
`).run(userId, clientA, "Atlântica — Campanha Verão (parcela 2)", 12500, nextMonth);

db.prepare(`
  INSERT INTO financial_entries (user_id, client_id, kind, description, category, amount, status, due_date, recurrence, is_fixed, created_at, updated_at)
  VALUES (?, ?, 'income', ?, 'projeto', ?, 'pending', ?, 'once', 0, datetime('now'), datetime('now'))
`).run(userId, clientB, "TechXYZ — Vídeo Produto", 18000, new Date(now.getFullYear(), now.getMonth(), 30).toISOString().slice(0, 10));

db.prepare(`
  INSERT INTO financial_entries (user_id, client_id, kind, description, category, amount, status, due_date, recurrence, is_fixed, created_at, updated_at)
  VALUES (?, ?, 'expense', ?, 'software', ?, 'pending', ?, 'monthly', 1, datetime('now'), datetime('now'))
`).run(userId, null, "DaVinci Resolve — licença", 1800, new Date(now.getFullYear(), now.getMonth(), 20).toISOString().slice(0, 10));

entryCount += 3;
console.log(`✅ ${entryCount} financial entries seeded (12 months history + 3 pending)`);

// ─── OPPORTUNITIES: Ensure we have entries in all stages for the funnel ───
db.prepare("DELETE FROM opportunities WHERE user_id = ?").run(userId);

const insertOpp = db.prepare(`
  INSERT INTO opportunities (user_id, client_id, title, stage, estimated_value, probability, expected_close_date, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now'))
`);

const opportunities = [
  // Prospect (2)
  [userId, clientC, "Cobertura Festival de Cinema", "prospect", 15000, 20, "2026-09-15", "-3 days"],
  [userId, null, "Indicação — Canal Gastronomia", "prospect", 8000, 15, "2026-08-20", "-2 days"],
  // Qualified (2)
  [userId, clientA, "Campanha Inverno 2026", "qualified", 30000, 45, "2026-09-01", "-10 days"],
  [userId, clientC, "Vídeos institucionais Harmonia", "qualified", 22000, 40, "2026-08-25", "-7 days"],
  // Proposal (2)
  [userId, allClients[4]?.id || null, "Documentário Raízes — produção", "proposal", 35000, 65, "2026-07-20", "-15 days"],
  [userId, clientB, "Série educacional TechXYZ", "proposal", 42000, 70, "2026-08-05", "-8 days"],
  // Negotiation (2)
  [userId, clientC, "Parceria eventos S2 2026", "negotiation", 48000, 80, "2026-07-25", "-20 days"],
  [userId, clientA, "Atlântica — Campanha Outono", "negotiation", 28000, 75, "2026-08-01", "-5 days"],
  // Won (3) — important for conversion rate
  [userId, clientB, "Retenção TechXYZ 2026", "won", 96000, 100, "2026-01-15", "-180 days"],
  [userId, clientA, "Campanha Verão 2026", "won", 25000, 100, "2026-03-01", "-120 days"],
  [userId, clientC, "Cobertura evento Harmonia", "won", 12000, 100, "2026-05-10", "-60 days"],
  // Lost (2) — for funnel balance
  [userId, null, "Proposta rejeitada — Startup ABC", "lost", 18000, 0, "2026-04-15", "-90 days"],
  [userId, null, "Cliente desistiu — Orçamento alto", "lost", 35000, 0, "2026-06-01", "-40 days"],
];

opportunities.forEach(o => insertOpp.run(...o));
console.log(`✅ ${opportunities.length} opportunities seeded (all funnel stages)`);

// ─── SUMMARY ───
console.log("\n🎉 Charts data seeded! Verifique:");
console.log("   • Comercial → Vendas por mês: 12 meses com valores crescentes");
console.log("   • Comercial → Funil: 2 prospect, 2 qualified, 2 proposal, 2 negotiation, 3 won, 2 lost");
console.log("   • Comercial → Previsão: baseada nos 12 meses de revenue");
console.log("   • Financeiro → Cashflow: 12 meses income vs expenses");
console.log("   • Financeiro → Pendentes: 3 entradas futuras");
console.log("   • Financeiro → Clientes por receita: TechXYZ e Atlântica com histórico\n");

db.close();
