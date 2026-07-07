/**
 * Seed Demo Data — Cena Studio
 *
 * Popula o banco SQLite com dados realistas para demonstrar todas as funcionalidades.
 * Usa o user admin@cenastudio.com.br que já existe no banco.
 *
 * Executar: npx tsx scripts/seed-demo-data.ts
 */

// import Database from "better-sqlite3"; // Removed: Using Prisma instead
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "frame.db");

if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found at ${dbPath}. Start the server first to create it.`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Get admin user ID
const admin = db.prepare("SELECT id FROM users WHERE email = 'admin@cenastudio.com.br'").get() as { id: number } | undefined;
if (!admin) {
  console.error("❌ Admin user not found. Start the server first.");
  process.exit(1);
}

const userId = admin.id;
console.log(`✅ Admin user found (id: ${userId}). Starting fresh seed...\n`);

// ─── CLEANUP EXISTING DATA ──────────────────────────────────────────────────
console.log("🧹 Cleaning up existing data...");
db.prepare("DELETE FROM video_comments").run();
db.prepare("DELETE FROM video_reviews").run();
db.prepare("DELETE FROM project_states").run();
db.prepare("DELETE FROM financial_entries WHERE user_id = ?").run(userId);
db.prepare("DELETE FROM interactions WHERE user_id = ?").run(userId);
db.prepare("DELETE FROM opportunities WHERE user_id = ?").run(userId);
db.prepare("DELETE FROM projects WHERE user_id = ?").run(userId);
db.prepare("DELETE FROM clients WHERE user_id = ?").run(userId);
console.log("✅ Cleanup complete.\n");

// ─── CLIENTS ────────────────────────────────────────────────────────────────
console.log("👥 Seeding clients...");
const insertClient = db.prepare(`
  INSERT INTO clients (user_id, name, company, email, phone, segment, status, workflow_stage, total_spent, city, state, industry, contact_person, contact_role, notes, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now'))
`);

const clients = [
  [userId, "Atlântica Beachwear", "Atlântica Moda Praia Ltda", "marketing@atlantica.com.br", "(21) 3322-1100", "brand", "active", "won", 45000, "Rio de Janeiro", "RJ", "Moda", "Carolina Vasconcelos", "Head de Marketing", "Cliente desde 2024. Campanha verão anual.", "-60 days"],
  [userId, "TechXYZ", "TechXYZ Solutions S.A.", "conteudo@techxyz.io", "(11) 4455-6677", "direct", "active", "recurrent", 78000, "São Paulo", "SP", "Tecnologia", "Rafael Augusto", "CEO", "Retainer mensal R$8k. Renovou em Jul/26.", "-120 days"],
  [userId, "Estúdio Harmonia", "Harmonia Produções ME", "parceria@harmonia.art", "(31) 98877-6655", "agency", "active", "qualified", 12000, "Belo Horizonte", "MG", "Entretenimento", "Pedro Almeida", "Sócio-Diretor", "Parceria para eventos. Negociando cobertura S2.", "-30 days"],
  [userId, "Gustavo Reis", null, "gustavo.reis@gmail.com", "(11) 91234-5678", "direct", "lead", "prospect", 0, "São Paulo", "SP", "Gastronomia", "Gustavo Reis", "Chef / Proprietário", "Indicação da Atlântica. Quer vídeos p/ canal.", "-5 days"],
  [userId, "Instituto Cultural Raízes", "ICR", "projetos@icr.org.br", "(21) 2233-4455", "direct", "active", "proposal", 0, "Rio de Janeiro", "RJ", "ONG / Cultura", "Amanda Souza", "Coord. Projetos", "Mini-doc sobre impacto social. Proposta enviada.", "-15 days"],
];

clients.forEach((c) => insertClient.run(...c));
const clientIds = db.prepare("SELECT id, name FROM clients WHERE user_id = ? ORDER BY id").all(userId) as Array<{ id: number; name: string }>;
console.log(`✅ ${clientIds.length} clients created.\n`);

// ─── PROJECTS ───────────────────────────────────────────────────────────────
console.log("📁 Seeding projects...");
const insertProject = db.prepare(`
  INSERT INTO projects (user_id, client_id, name, description, status, metadata_json, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now'))
`);

const atlantica = clientIds.find(c => c.name === "Atlântica Beachwear")!.id;
const techxyz = clientIds.find(c => c.name === "TechXYZ")!.id;
const raizes = clientIds.find(c => c.name === "Instituto Cultural Raízes")!.id;

const projects = [
  [userId, atlantica, "Campanha Verão 2026", "Filme institucional + pacote Reels para campanha de verão", "active", JSON.stringify({ projectType: "Comercial", workflowStage: "production", deadline: "2026-08-15", progress: 45 }), "-25 days"],
  [userId, techxyz, "Vídeo Produto SaaS", "Vídeo demo para o novo produto TechXYZ Platform", "active", JSON.stringify({ projectType: "Institucional", workflowStage: "review", deadline: "2026-07-30", progress: 70 }), "-20 days"],
  [userId, raizes, "Documentário Raízes", "Mini-doc sobre projetos culturais na periferia do RJ", "active", JSON.stringify({ projectType: "Documentário", workflowStage: "planning", deadline: "2026-09-30", progress: 15 }), "-10 days"],
  [userId, techxyz, "Série Mensal TechXYZ", "4 vídeos mensais para LinkedIn e YouTube", "active", JSON.stringify({ projectType: "Social media", workflowStage: "production", progress: 30 }), "-90 days"],
];

projects.forEach((p) => insertProject.run(...p));
const projectIds = db.prepare("SELECT id, name FROM projects WHERE user_id = ? ORDER BY id").all(userId) as Array<{ id: number; name: string }>;
console.log(`✅ ${projectIds.length} projects created.\n`);

// ─── OPPORTUNITIES ──────────────────────────────────────────────────────────
console.log("💼 Seeding opportunities...");
const insertOpp = db.prepare(`
  INSERT INTO opportunities (user_id, client_id, title, stage, estimated_value, probability, expected_close_date, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now'))
`);

const gustavo = clientIds.find(c => c.name === "Gustavo Reis")!.id;
const harmonia = clientIds.find(c => c.name === "Estúdio Harmonia")!.id;

const opportunities = [
  [userId, raizes, "Documentário Raízes — produção completa", "proposal", 35000, 70, "2026-07-20", "-7 days"],
  [userId, gustavo, "Vídeo Gastronômico — Canal YouTube", "prospect", 12000, 25, "2026-08-10", "-3 days"],
  [userId, harmonia, "Parceria cobertura eventos 2026", "negotiation", 48000, 60, "2026-07-25", "-12 days"],
  [userId, atlantica, "Campanha Inverno 2026 (extensão)", "qualified", 30000, 50, "2026-09-01", "-8 days"],
  [userId, techxyz, "Retenção anual TechXYZ — renovação", "won", 96000, 100, "2026-07-01", "-5 days"],
];

opportunities.forEach((o) => insertOpp.run(...o));
console.log(`✅ ${opportunities.length} opportunities created.\n`);

// ─── INTERACTIONS ───────────────────────────────────────────────────────────
console.log("💬 Seeding interactions...");
const insertInt = db.prepare(`
  INSERT INTO interactions (user_id, client_id, opportunity_id, type, subject, notes, next_follow_up, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
`);

const interactions = [
  [userId, atlantica, null, "meeting", "Kickoff Campanha Verão", "Definimos cronograma, locações. Carolina quer tom empoderamento feminino.", "2026-07-10T14:00:00Z", "-6 days"],
  [userId, raizes, null, "call", "Proposta Doc Raízes", "Amanda gostou do escopo. Pediu redução de 35k para 30k. Retorno em 3 dias.", "2026-07-09T10:00:00Z", "-2 days"],
  [userId, harmonia, null, "email", "Follow-up parceria eventos", "Enviei proposta detalhada. Pedro pediu fotos still.", "2026-07-12T16:00:00Z", "-4 days"],
  [userId, techxyz, null, "meeting", "Renovação retainer anual", "Contrato renovado por mais 12 meses. R$8k/mês.", null, "-5 days"],
  [userId, gustavo, null, "whatsapp", "Primeiro contato — indicação", "Gustavo viu trabalho da Atlântica. Quer canal gastronomia.", "2026-07-14T11:00:00Z", "-3 days"],
];

interactions.forEach((i) => insertInt.run(...i));
console.log(`✅ ${interactions.length} interactions created.\n`);

// ─── FINANCIAL ENTRIES ──────────────────────────────────────────────────────
console.log("💰 Seeding financial entries...");
const insertFinancial = db.prepare(`
  INSERT INTO financial_entries (user_id, client_id, kind, description, category, amount, status, due_date, paid_at, recurrence, is_fixed, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

const financial = [
  // Income - settled (últimos 6 meses com dados distribuídos)
  [userId, techxyz, "income", "TechXYZ — Retainer julho/26", "projeto", 8000, "settled", "2026-07-05", "2026-07-05T10:00:00Z", "monthly", 0],
  [userId, atlantica, "income", "Atlântica — Parcela 1/2 Campanha Verão", "projeto", 12500, "settled", "2026-07-01", "2026-07-02T14:30:00Z", "once", 0],
  [userId, techxyz, "income", "TechXYZ — Retainer junho/26", "projeto", 8000, "settled", "2026-06-05", "2026-06-05T09:00:00Z", "monthly", 0],
  [userId, techxyz, "income", "TechXYZ — Retainer maio/26", "projeto", 8000, "settled", "2026-05-05", "2026-05-06T11:00:00Z", "monthly", 0],
  [userId, techxyz, "income", "TechXYZ — Retainer abril/26", "projeto", 8000, "settled", "2026-04-05", "2026-04-05T10:00:00Z", "monthly", 0],
  [userId, techxyz, "income", "TechXYZ — Retainer março/26", "projeto", 8000, "settled", "2026-03-05", "2026-03-05T09:00:00Z", "monthly", 0],
  [userId, atlantica, "income", "Atlântica — Projeto Primavera 2026", "projeto", 18000, "settled", "2026-04-20", "2026-04-22T15:00:00Z", "once", 0],
  [userId, harmonia, "income", "Estúdio Harmonia — Cobertura Evento Maio", "projeto", 6000, "settled", "2026-05-25", "2026-05-28T10:00:00Z", "once", 0],
  [userId, harmonia, "income", "Estúdio Harmonia — Cobertura Evento Junho", "projeto", 6000, "settled", "2026-06-20", "2026-06-21T16:00:00Z", "once", 0],
  [userId, techxyz, "income", "TechXYZ — Setup inicial", "projeto", 22000, "settled", "2026-03-15", "2026-03-15T14:00:00Z", "once", 0],

  // Income - pending
  [userId, atlantica, "income", "Atlântica — Parcela 2/2 Campanha Verão", "projeto", 12500, "pending", "2026-08-15", null, "once", 0],
  [userId, techxyz, "income", "TechXYZ — Vídeo Produto (parcela única)", "projeto", 18000, "pending", "2026-07-30", null, "once", 0],

  // Expenses - settled (últimos 6 meses)
  [userId, null, "expense", "Adobe Creative Cloud — julho", "software", 350, "settled", "2026-07-03", "2026-07-03T08:00:00Z", "monthly", 1],
  [userId, null, "expense", "Adobe Creative Cloud — junho", "software", 350, "settled", "2026-06-03", "2026-06-03T08:00:00Z", "monthly", 1],
  [userId, null, "expense", "Adobe Creative Cloud — maio", "software", 350, "settled", "2026-05-03", "2026-05-03T08:00:00Z", "monthly", 1],
  [userId, null, "expense", "Adobe Creative Cloud — abril", "software", 350, "settled", "2026-04-03", "2026-04-03T08:00:00Z", "monthly", 1],
  [userId, atlantica, "expense", "Diária DOP — Campanha Verão", "equipe", 3500, "settled", "2026-07-06", "2026-07-06T18:00:00Z", "once", 0],
  [userId, null, "expense", "Aluguel estúdio — julho", "estrutura", 4200, "settled", "2026-07-01", "2026-07-01T09:00:00Z", "monthly", 1],
  [userId, null, "expense", "Aluguel estúdio — junho", "estrutura", 4200, "settled", "2026-06-01", "2026-06-01T09:00:00Z", "monthly", 1],
  [userId, null, "expense", "Aluguel estúdio — maio", "estrutura", 4200, "settled", "2026-05-01", "2026-05-01T09:00:00Z", "monthly", 1],
  [userId, null, "expense", "Aluguel estúdio — abril", "estrutura", 4200, "settled", "2026-04-01", "2026-04-01T09:00:00Z", "monthly", 1],
  [userId, raizes, "expense", "Pesquisa — Doc Raízes", "equipe", 1200, "settled", "2026-07-04", "2026-07-04T19:00:00Z", "once", 0],
  [userId, null, "expense", "Frame.io — julho", "software", 180, "settled", "2026-07-01", "2026-07-01T08:00:00Z", "monthly", 1],
  [userId, null, "expense", "Frame.io — junho", "software", 180, "settled", "2026-06-01", "2026-06-01T08:00:00Z", "monthly", 1],
  [userId, null, "expense", "Internet — julho", "estrutura", 280, "settled", "2026-07-05", "2026-07-05T08:00:00Z", "monthly", 1],
  [userId, null, "expense", "Internet — junho", "estrutura", 280, "settled", "2026-06-05", "2026-06-05T08:00:00Z", "monthly", 1],
  [userId, atlantica, "expense", "Produção Primavera — Equipe", "equipe", 5200, "settled", "2026-04-18", "2026-04-18T16:00:00Z", "once", 0],
  [userId, harmonia, "expense", "Aluguel equipamento — Maio", "producao", 1800, "settled", "2026-05-26", "2026-05-26T14:00:00Z", "once", 0],

  // Expenses - pending
  [userId, null, "expense", "DaVinci Resolve — licença", "software", 1800, "pending", "2026-07-15", null, "once", 0],
  [userId, atlantica, "expense", "Diária equipe — dia 2", "equipe", 4200, "pending", "2026-07-12", null, "once", 0],
  [userId, techxyz, "expense", "Motion Designer", "equipe", 2800, "pending", "2026-07-22", null, "once", 0],
  [userId, raizes, "expense", "Locação — Doc Raízes", "producao", 1500, "pending", "2026-07-18", null, "once", 0],
];

financial.forEach((f) => insertFinancial.run(...f));
console.log(`✅ ${financial.length} financial entries created.\n`);

// ─── VIDEO REVIEWS ──────────────────────────────────────────────────────────
console.log("🎬 Seeding video reviews...");
const insertReview = db.prepare(`
  INSERT INTO video_reviews (project_id, user_id, title, description, status, video_url, share_token, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

const proj1 = projectIds.find(p => p.name === "Campanha Verão 2026")!.id;
const proj2 = projectIds.find(p => p.name === "Vídeo Produto SaaS")!.id;

const reviews = [
  [proj2, userId, "TechXYZ Product — Corte 1", "Primeiro corte para aprovação do cliente", "changes_requested", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "review_abc123"],
  [proj1, userId, "Atlântica Verão — Teaser 30s", "Teaser para aprovação antes de finalizar o filme completo", "approved", "https://vimeo.com/example", "review_def456"],
];

reviews.forEach((r) => insertReview.run(...r));
const reviewIds = db.prepare("SELECT id FROM video_reviews WHERE user_id = ? ORDER BY id").all(userId) as Array<{ id: number }>;
console.log(`✅ ${reviewIds.length} video reviews created.\n`);

// ─── VIDEO COMMENTS ─────────────────────────────────────────────────────────
console.log("💭 Seeding video comments...");
const insertComment = db.prepare(`
  INSERT INTO video_comments (review_id, user_id, author_name, timestamp_seconds, comment, annotations, resolved, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

const comments = [
  [reviewIds[0].id, userId, "Rafael (TechXYZ)", 12.5, "Aqui o texto na tela está cortado no mobile. Precisa ajustar o safe area.", "[]", 0],
  [reviewIds[0].id, userId, "Rafael (TechXYZ)", 45.0, "A música nesse trecho está muito alta, abafa minha fala. Reduzir -6dB.", "[]", 1],
  [reviewIds[0].id, userId, "Dante", 68.0, "Vou trocar esse plano por um com mais movimento. Ficou estático demais.", "[]", 0],
  [reviewIds[1].id, userId, "Carolina (Atlântica)", 8.0, "Amei esse plano! Exatamente o feeling que buscamos. Aprovado ✓", "[]", 1],
];

comments.forEach((c) => insertComment.run(...c));
console.log(`✅ ${comments.length} video comments created.\n`);

// ─── SUMMARY ────────────────────────────────────────────────────────────────
console.log("\n🎉 Seed complete!\n");
console.log("Summary:");
console.log(`  👥 Clients: ${clientIds.length}`);
console.log(`  📁 Projects: ${projectIds.length}`);
console.log(`  💼 Opportunities: ${opportunities.length}`);
console.log(`  💬 Interactions: ${interactions.length}`);
console.log(`  💰 Financial entries: ${financial.length}`);
console.log(`  🎬 Video reviews: ${reviewIds.length}`);
console.log(`  💭 Comments: ${comments.length}\n`);

console.log("✨ You can now test the full client-hub-connected-workflows integration!");
console.log("   Navigate to: http://localhost:5173/clients\n");

db.close();
