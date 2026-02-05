#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL && !process.env.POSTGRES_URL_NON_POOLING) {
  dotenv.config({ path: ".env.local" });
}

const sourceUrl =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL || null;

if (!sourceUrl) {
  console.error("POSTGRES_URL missing. Set POSTGRES_URL (or DATABASE_URL) before running backup.");
  process.exit(1);
}

const argOutput = process.argv.find((arg) => arg.startsWith("--output="))?.split("=")[1] || null;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = argOutput || path.join("tmp", "backups", `backup-${stamp}.sql`);
const outputDir = path.dirname(outputPath);
fs.mkdirSync(outputDir, { recursive: true });

const dump = spawnSync(
  "pg_dump",
  ["--no-owner", "--no-privileges", "--format=plain", "--file", outputPath, sourceUrl],
  {
    stdio: "inherit",
    env: process.env,
  },
);

if (dump.error) {
  if (dump.error.message.includes("ENOENT")) {
    console.error("pg_dump not found. Install PostgreSQL client tools and retry.");
  } else {
    console.error(`Backup failed: ${dump.error.message}`);
  }
  process.exit(1);
}

if (dump.status !== 0) {
  process.exit(dump.status ?? 1);
}

console.log(`Backup created: ${outputPath}`);
