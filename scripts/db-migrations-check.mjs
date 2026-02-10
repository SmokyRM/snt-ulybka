#!/usr/bin/env node

import {
  defaultMigrationsDir,
  listMigrationFiles,
  validateMigrationFiles,
} from "./lib/migrations-check.mjs";

const dir = defaultMigrationsDir();
const files = listMigrationFiles(dir);
const { errors, warnings } = validateMigrationFiles(files, { requireSequential: true });

if (warnings.length > 0) {
  for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

console.log(`OK: migration file checks passed (${files.length} files)`);
