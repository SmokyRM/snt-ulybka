#!/usr/bin/env node

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL && !process.env.POSTGRES_URL_NON_POOLING) {
  dotenv.config({ path: ".env.local" });
}

const parseArg = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] || null;

const filePath = parseArg("file");
const targetUrl =
  parseArg("target-url") ||
  process.env.TARGET_POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  null;

if (!filePath) {
  console.error("Missing --file=/path/to/backup.sql");
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`Backup file not found: ${filePath}`);
  process.exit(1);
}

if (!targetUrl) {
  console.error("Target database URL missing. Use --target-url=... or TARGET_POSTGRES_URL.");
  process.exit(1);
}

const restore = spawnSync(
  "psql",
  [targetUrl, "--set", "ON_ERROR_STOP=1", "--single-transaction", "--file", filePath],
  {
    stdio: "inherit",
    env: process.env,
  },
);

if (restore.error) {
  if (restore.error.message.includes("ENOENT")) {
    console.error("psql not found. Install PostgreSQL client tools and retry.");
  } else {
    console.error(`Restore failed: ${restore.error.message}`);
  }
  process.exit(1);
}

if (restore.status !== 0) {
  process.exit(restore.status ?? 1);
}

console.log(`Restore completed from ${filePath}`);
