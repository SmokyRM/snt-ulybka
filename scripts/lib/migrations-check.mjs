import fs from "node:fs";
import path from "node:path";

export const MIGRATION_FILE_RE = /^(\d+)_([a-z0-9._-]+)\.sql$/i;

export function parseMigrationFile(filename) {
  const match = MIGRATION_FILE_RE.exec(filename);
  if (!match) return null;
  return {
    filename,
    numberRaw: match[1],
    number: Number.parseInt(match[1], 10),
  };
}

export function listMigrationFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

export function validateMigrationFiles(files, options = {}) {
  const requireSequential = Boolean(options.requireSequential);
  const errors = [];
  const warnings = [];
  const parsed = [];
  const byNumber = new Map();

  for (const filename of files) {
    const entry = parseMigrationFile(filename);
    if (!entry) {
      errors.push(`Invalid migration filename: "${filename}" (expected 001_name.sql)`);
      continue;
    }
    parsed.push(entry);
    const existing = byNumber.get(entry.number);
    if (existing) {
      errors.push(`Duplicate migration number ${entry.numberRaw}: "${existing}" and "${filename}"`);
    } else {
      byNumber.set(entry.number, filename);
    }
  }

  const lexicographic = [...parsed].map((entry) => entry.filename);
  const numeric = [...parsed]
    .sort((a, b) => a.number - b.number || a.filename.localeCompare(b.filename))
    .map((entry) => entry.filename);

  if (lexicographic.join("|") !== numeric.join("|")) {
    errors.push("Migration ordering mismatch: use stable zero-padded numbering (001, 002, ...).");
  }

  if (requireSequential && parsed.length > 0) {
    const numbers = [...new Set(parsed.map((entry) => entry.number))].sort((a, b) => a - b);
    for (let index = 1; index < numbers.length; index += 1) {
      const expected = numbers[index - 1] + 1;
      if (numbers[index] !== expected) {
        warnings.push(`Gap detected between ${numbers[index - 1]} and ${numbers[index]} (missing ${expected}).`);
      }
    }
  }

  return { errors, warnings, parsed };
}

export function defaultMigrationsDir() {
  return path.join(process.cwd(), "db", "migrations");
}
