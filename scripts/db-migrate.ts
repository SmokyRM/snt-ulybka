import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { exec, sql } from "../src/db/client";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  dotenv.config({ path: ".env.local" });
}
process.env.POSTGRES_URL ||= process.env.DATABASE_URL;

async function ensureMigrationsTable() {
  await exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(client: typeof sql) {
  const rows = (await client<{ id: string }[]>`SELECT id FROM schema_migrations ORDER BY id ASC`) as Array<{
    id: string;
  }>;
  return new Set(rows.map((row: { id: string }) => row.id));
}

async function applyMigration(client: typeof sql, id: string, content: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await client.begin(async (tx: any) => {
    await tx.unsafe(content);
    await tx`INSERT INTO schema_migrations (id) VALUES (${id})`;
  });
}

async function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations folder not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file: string) => file.endsWith(".sql"))
    .sort();

  await ensureMigrationsTable();
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
