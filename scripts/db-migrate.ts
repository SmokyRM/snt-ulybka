import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { exec, sql } from "../src/db/client";
import { listMigrationFiles, validateMigrationFiles } from "./lib/migrations-check.mjs";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  dotenv.config({ path: ".env.local" });
}
process.env.POSTGRES_URL ||= process.env.DATABASE_URL;

async function ensureMigrationsTable() {
  await exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await exec(`
    ALTER TABLE schema_migrations
    ADD COLUMN IF NOT EXISTS filename text;
  `);
  await exec(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'schema_migrations'
          AND column_name = 'id'
      ) THEN
        EXECUTE 'UPDATE schema_migrations SET filename = id WHERE filename IS NULL';
      END IF;
    END
    $$;
  `);
  await exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS schema_migrations_filename_uq
    ON schema_migrations (filename);
  `);
}

async function getAppliedMigrations(client: typeof sql) {
  const rows = (await client<{ filename: string }[]>`
    SELECT filename
    FROM schema_migrations
    WHERE filename IS NOT NULL
    ORDER BY filename ASC
  `) as Array<{
    filename: string;
  }>;
  return new Set(rows.map((row: { filename: string }) => row.filename));
}

async function applyMigration(client: typeof sql, id: string, content: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await client.begin(async (tx: any) => {
    await tx.unsafe(content);
    await tx`
      INSERT INTO schema_migrations (filename)
      VALUES (${id})
      ON CONFLICT (filename) DO NOTHING
    `;
  });
}

async function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations folder not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = listMigrationFiles(MIGRATIONS_DIR);
  const validation = validateMigrationFiles(files, { requireSequential: true });
  if (validation.errors.length > 0) {
    validation.errors.forEach((error: string) => console.error(`ERROR: ${error}`));
    process.exit(1);
  }
  validation.warnings.forEach((warning: string) => console.warn(`WARN: ${warning}`));

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
