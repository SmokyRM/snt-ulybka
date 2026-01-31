import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

type SqlClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<{ id: string }> }>;
};

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  dotenv.config({ path: ".env.local" });
}
process.env.POSTGRES_URL ||= process.env.DATABASE_URL;

async function ensureMigrationsTable(sql: SqlClient) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(sql: SqlClient) {
  const result = await sql.query("SELECT id FROM schema_migrations ORDER BY id ASC");
  return new Set(result.rows.map((row) => row.id));
}

async function applyMigration(sql: SqlClient, id: string, content: string) {
  await sql.query("BEGIN");
  try {
    await sql.query(content);
    await sql.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
    await sql.query("COMMIT");
  } catch (error) {
    await sql.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("POSTGRES_URL missing");
    process.exit(1);
  }

  const { sql } = (await import("@vercel/postgres")) as { sql: SqlClient };

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations folder not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file: string) => file.endsWith(".sql"))
    .sort();

  await ensureMigrationsTable(sql);
  const applied = await getAppliedMigrations(sql);

  for (const file of files) {
    if (applied.has(file)) continue;
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const content = fs.readFileSync(fullPath, "utf8");
    if (!content.trim()) continue;
    console.log(`Applying migration ${file}...`);
    await applyMigration(sql, file, content);
    console.log(`Applied ${file}`);
  }

  console.log("Migrations complete");
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
