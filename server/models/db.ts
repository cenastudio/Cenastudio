import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TOOLS } from "../../shared/tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath =
  process.env.VERCEL === "1"
    ? path.join("/tmp", "frame.db")
    : path.join(__dirname, "..", "..", "data", "frame.db");
const dbPath = process.env.DATABASE_PATH || defaultDbPath;
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function ensureUserColumns() {
  const userCols = (db.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map(
    (c) => c.name,
  );
  if (!userCols.includes("name")) db.prepare("ALTER TABLE users ADD COLUMN name TEXT").run();
  if (!userCols.includes("avatar_url")) db.prepare("ALTER TABLE users ADD COLUMN avatar_url TEXT").run();
  if (!userCols.includes("email_verified")) {
    db.prepare("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0").run();
  }
  if (!userCols.includes("github_id")) db.prepare("ALTER TABLE users ADD COLUMN github_id TEXT").run();
  if (!userCols.includes("studio_name")) db.prepare("ALTER TABLE users ADD COLUMN studio_name TEXT").run();
  if (!userCols.includes("studio_role")) db.prepare("ALTER TABLE users ADD COLUMN studio_role TEXT").run();
  if (!userCols.includes("phone")) db.prepare("ALTER TABLE users ADD COLUMN phone TEXT").run();
}

function ensureSubscriptionColumns() {
  const subCols = (db.prepare("PRAGMA table_info(subscriptions)").all() as { name: string }[]).map(
    (c) => c.name,
  );
  if (!subCols.includes("stripe_customer_id")) {
    db.prepare("ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT").run();
  }
  if (!subCols.includes("stripe_subscription_id")) {
    db.prepare("ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT").run();
  }
}

function ensureProjectColumns() {
  const genCols = (db.prepare("PRAGMA table_info(generations)").all() as { name: string }[]).map(
    (c) => c.name,
  );
  if (!genCols.includes("project_id")) {
    db.prepare("ALTER TABLE generations ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL").run();
  }

  const projCols = (db.prepare("PRAGMA table_info(projects)").all() as { name: string }[]).map(
    (c) => c.name,
  );
  if (!projCols.includes("client_id")) {
    db.prepare("ALTER TABLE projects ADD COLUMN client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL").run();
  }
  if (!projCols.includes("status")) {
    db.prepare("ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active'").run();
  }
}

function ensureClientColumns() {
  const clientCols = (db.prepare("PRAGMA table_info(clients)").all() as { name: string }[]).map(
    (c) => c.name,
  );
  if (!clientCols.includes("workflow_stage")) {
    db.prepare("ALTER TABLE clients ADD COLUMN workflow_stage TEXT DEFAULT 'prospect'").run();
  }
  if (!clientCols.includes("address")) {
    db.prepare("ALTER TABLE clients ADD COLUMN address TEXT").run();
  }
  if (!clientCols.includes("city")) {
    db.prepare("ALTER TABLE clients ADD COLUMN city TEXT").run();
  }
  if (!clientCols.includes("state")) {
    db.prepare("ALTER TABLE clients ADD COLUMN state TEXT").run();
  }
  if (!clientCols.includes("country")) {
    db.prepare("ALTER TABLE clients ADD COLUMN country TEXT").run();
  }
  if (!clientCols.includes("website")) {
    db.prepare("ALTER TABLE clients ADD COLUMN website TEXT").run();
  }
  if (!clientCols.includes("linkedin")) {
    db.prepare("ALTER TABLE clients ADD COLUMN linkedin TEXT").run();
  }
  if (!clientCols.includes("instagram")) {
    db.prepare("ALTER TABLE clients ADD COLUMN instagram TEXT").run();
  }
  if (!clientCols.includes("industry")) {
    db.prepare("ALTER TABLE clients ADD COLUMN industry TEXT").run();
  }
  if (!clientCols.includes("company_size")) {
    db.prepare("ALTER TABLE clients ADD COLUMN company_size TEXT").run();
  }
  if (!clientCols.includes("annual_revenue")) {
    db.prepare("ALTER TABLE clients ADD COLUMN annual_revenue INTEGER").run();
  }
  if (!clientCols.includes("contact_person")) {
    db.prepare("ALTER TABLE clients ADD COLUMN contact_person TEXT").run();
  }
  if (!clientCols.includes("contact_role")) {
    db.prepare("ALTER TABLE clients ADD COLUMN contact_role TEXT").run();
  }
  if (!clientCols.includes("billing_cycle")) {
    db.prepare("ALTER TABLE clients ADD COLUMN billing_cycle TEXT").run();
  }
  if (!clientCols.includes("payment_method")) {
    db.prepare("ALTER TABLE clients ADD COLUMN payment_method TEXT").run();
  }
  if (!clientCols.includes("tax_id")) {
    db.prepare("ALTER TABLE clients ADD COLUMN tax_id TEXT").run();
  }
}

function ensureCollaboratorColumns() {
  const collaboratorCols = (
    db.prepare("PRAGMA table_info(collaborators)").all() as { name: string }[]
  ).map((c) => c.name);

  if (!collaboratorCols.includes("phone")) {
    db.prepare("ALTER TABLE collaborators ADD COLUMN phone TEXT DEFAULT ''").run();
  }
  if (!collaboratorCols.includes("skills")) {
    db.prepare("ALTER TABLE collaborators ADD COLUMN skills TEXT").run();
  }
  if (!collaboratorCols.includes("daily_rate")) {
    db.prepare("ALTER TABLE collaborators ADD COLUMN daily_rate INTEGER DEFAULT 0").run();
  }
  if (!collaboratorCols.includes("status")) {
    db.prepare("ALTER TABLE collaborators ADD COLUMN status TEXT DEFAULT 'active'").run();
  }
  if (!collaboratorCols.includes("availability")) {
    db.prepare("ALTER TABLE collaborators ADD COLUMN availability TEXT").run();
  }
  if (!collaboratorCols.includes("updated_at")) {
    db.prepare("ALTER TABLE collaborators ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))").run();
  }
}

function ensureVideoReviewColumns() {
  const reviewsCols = (db.prepare("PRAGMA table_info(video_reviews)").all() as { name: string }[]).map(
    (c) => c.name,
  );
  if (!reviewsCols.includes("video_url")) {
    db.prepare("ALTER TABLE video_reviews ADD COLUMN video_url TEXT").run();
  }

  const fileIdCol = (
    db.prepare("PRAGMA table_info(video_reviews)").all() as { name: string; notnull: number }[]
  ).find((c) => c.name === "file_id");
  if (fileIdCol?.notnull) {
    db.pragma("foreign_keys = OFF");
    try {
      db.exec(`
        BEGIN;

        CREATE TABLE IF NOT EXISTS video_reviews_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'draft',
          share_token TEXT UNIQUE,
          expires_at TEXT,
          video_url TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );

        INSERT INTO video_reviews_new (
          id, project_id, file_id, user_id, title, description, status,
          share_token, expires_at, video_url, created_at, updated_at
        )
        SELECT
          id, project_id, file_id, user_id, title, description, status,
          share_token, expires_at, video_url, created_at, updated_at
        FROM video_reviews;

        DROP TABLE video_reviews;
        ALTER TABLE video_reviews_new RENAME TO video_reviews;

        COMMIT;
      `);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      db.pragma("foreign_keys = ON");
    }
  }

  const commentsCols = (db.prepare("PRAGMA table_info(video_comments)").all() as { name: string }[]).map(
    (c) => c.name,
  );
  if (!commentsCols.includes("annotations")) {
    db.prepare("ALTER TABLE video_comments ADD COLUMN annotations TEXT DEFAULT '[]'").run();
  }
}

function ensureStudioSettingsColumns() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS studio_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      studio_name TEXT NOT NULL DEFAULT 'Cena Studio',
      legal_name TEXT DEFAULT '',
      document TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      city TEXT DEFAULT '',
      website TEXT DEFAULT '',
      signature TEXT DEFAULT 'Responsavel comercial',
      primary_color TEXT DEFAULT '#ff4d1d',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function ensureSubscription(userId: number, planId: string, status = "active") {
  const existing = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").get(userId);
  if (!existing) {
    db.prepare(
      `INSERT INTO subscriptions (user_id, plan_id, status, current_period_end)
       VALUES (?, ?, ?, datetime('now', '+1 month'))`,
    ).run(userId, planId, status);
  }
}

function createIndexes() {
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id)",
    "CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id)",
    "CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)",
    "CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)",
    "CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_generations_tool_id ON generations(tool_id)",
    "CREATE INDEX IF NOT EXISTS idx_generations_project_id ON generations(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_project_states_project_id ON project_states(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_interactions_client_id ON interactions(client_id)",
    "CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON opportunities(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_opportunities_client_id ON opportunities(client_id)",
    "CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage)",
    "CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_video_reviews_project_id ON video_reviews(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_video_reviews_share_token ON video_reviews(share_token)",
    "CREATE INDEX IF NOT EXISTS idx_video_comments_review_id ON video_comments(review_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)",
    "CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON collaborators(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_project_members_collaborator_id ON project_members(collaborator_id)",
    "CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON reset_tokens(token)",
    "CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_studio_settings_user_id ON studio_settings(user_id)",
  ];
  for (const sql of indexes) {
    db.exec(sql);
  }
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      tool_id TEXT REFERENCES tools(id),
      input TEXT,
      output TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'contact',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price_brl INTEGER NOT NULL,
      generation_limit INTEGER NOT NULL,
      features TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      status TEXT NOT NULL DEFAULT 'active',
      trial_ends_at TEXT,
      current_period_start TEXT DEFAULT (datetime('now')),
      current_period_end TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tool_id TEXT NOT NULL,
      period TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, tool_id, period)
    );

    CREATE TABLE IF NOT EXISTS reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      tool_id TEXT NOT NULL,
      form_data TEXT,
      output_data TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(project_id, tool_id)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT,
      phone TEXT,
      segment TEXT DEFAULT 'direct',
      status TEXT DEFAULT 'lead',
      workflow_stage TEXT DEFAULT 'prospect',
      notes TEXT,
      total_spent INTEGER DEFAULT 0,
      first_contact_at TEXT,
      last_contact_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      stage TEXT DEFAULT 'prospect',
      estimated_value INTEGER,
      probability INTEGER DEFAULT 50,
      expected_close_date TEXT,
      lost_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
      type TEXT,
      subject TEXT,
      notes TEXT,
      next_follow_up TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS collaborators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      phone TEXT DEFAULT '',
      skills TEXT,
      daily_rate INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      availability TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      collaborator_id INTEGER REFERENCES collaborators(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      permissions TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      path TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS video_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft',
      share_token TEXT UNIQUE,
      expires_at TEXT,
      video_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS video_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL REFERENCES video_reviews(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      timestamp_seconds REAL NOT NULL,
      comment TEXT NOT NULL,
      resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      link TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  ensureUserColumns();
  ensureSubscriptionColumns();
  ensureProjectColumns();
  ensureClientColumns();
  ensureCollaboratorColumns();
  ensureVideoReviewColumns();
  ensureStudioSettingsColumns();
  createIndexes();

  const planCount = db.prepare("SELECT COUNT(*) as c FROM plans").get() as { c: number };
  if (planCount.c === 0) {
    const insertPlan = db.prepare(
      "INSERT INTO plans (id, name, price_brl, generation_limit, features) VALUES (?, ?, ?, ?, ?)",
    );
    insertPlan.run(
      "free",
      "Free",
      0,
      5,
      JSON.stringify(["5 gerações/mês", "Acesso a 6 ferramentas", "Export .txt"]),
    );
    insertPlan.run(
      "pro",
      "Pro",
      4900,
      50,
      JSON.stringify([
        "50 gerações/mês",
        "Todas as 12 ferramentas",
        "Export PDF e DOCX",
        "Histórico completo",
      ]),
    );
    insertPlan.run(
      "studio",
      "Studio",
      9900,
      -1,
      JSON.stringify([
        "Gerações ilimitadas",
        "Todas as 12 ferramentas",
        "Projetos e pastas",
        "Suporte prioritário",
      ]),
    );
  }

  const seedAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@cenastudio.com.br") as
    | { id: number }
    | undefined;
  if (!seedAdmin) {
    const hash = bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD || "admin123", 10);
    const result = db
      .prepare(
        "INSERT INTO users (name, email, password_hash, role, email_verified) VALUES (?, ?, ?, 'admin', 1)",
      )
      .run("Admin", "admin@cenastudio.com.br", hash);
    ensureSubscription(Number(result.lastInsertRowid), "studio", "active");
  } else {
    ensureSubscription(seedAdmin.id, "studio", "active");
  }

  const seedDemo = db.prepare("SELECT id FROM users WHERE email = ?").get("demo@cenastudio.com.br") as
    | { id: number }
    | undefined;
  if (!seedDemo) {
    const hash = bcrypt.hashSync(process.env.DEMO_USER_PASSWORD || "demo123", 10);
    const result = db
      .prepare(
        "INSERT INTO users (name, email, password_hash, role, email_verified) VALUES (?, ?, ?, 'user', 1)",
      )
      .run("Demo User", "demo@cenastudio.com.br", hash);
    ensureSubscription(Number(result.lastInsertRowid), "free", "active");
  } else {
    ensureSubscription(seedDemo.id, "free", "active");
  }

  const insertTool = db.prepare(`
    INSERT INTO tools (id, name, description, category, is_active)
    VALUES (@id, @name, @description, @category, 1)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      updated_at = datetime('now')
  `);

  for (const tool of TOOLS) {
    insertTool.run({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
    });
  }
}
