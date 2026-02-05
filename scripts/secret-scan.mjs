#!/usr/bin/env node
/**
 * secret-scan.mjs
 *
 * Scans tracked files for potential secrets/credentials.
 * Run in CI and pre-commit to prevent accidental leaks.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Patterns that indicate potential secrets.
// Keep scope tight to avoid false positives in test fixtures.
const SECRET_PATTERNS = [
  { pattern: /^SESSION_SECRET\s*=\s*.+$/gm, name: "SESSION_SECRET assignment" },
  { pattern: /^POSTGRES_URL\s*=\s*.+$/gm, name: "POSTGRES_URL assignment" },
  { pattern: /^DATABASE_URL\s*=\s*.+$/gm, name: "DATABASE_URL assignment" },
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, name: "OpenAI-style key" },
  { pattern: /PRIVATE_KEY\s*[:=]\s*["'][^"']+["']/gi, name: "Private key variable" },
  { pattern: /-----BEGIN RSA PRIVATE KEY-----/g, name: "RSA private key" },
  { pattern: /-----BEGIN PRIVATE KEY-----/g, name: "Private key" },
];

// Files/directories to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /\.env\.example$/,
  /\.env\.local\.example$/,
  /^\.env(\..+)?$/,
  /^tmp\//,
  /secret-scan\.mjs$/, // Don't scan ourselves
  /security-scan\.ts$/, // Don't scan the security scanner
  /security-scan\.mjs$/, // Don't scan the security scanner
  /\.md$/, // Skip markdown (documentation)
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
];

// Get list of tracked files
function getTrackedFiles() {
  try {
    const output = execSync("git ls-files", { encoding: "utf-8" });
    return output.split("\n").filter((f) => f.trim());
  } catch {
    // Fallback: scan all files in current directory
    console.warn("Warning: Not a git repository, scanning all files");
    return getAllFiles(".");
  }
}

function getAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_PATTERNS.some((p) => p.test(fullPath))) {
        getAllFiles(fullPath, files);
      }
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some((pattern) => pattern.test(filePath));
}

function scanFile(filePath) {
  const findings = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");

    for (const { pattern, name } of SECRET_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      const matches = content.match(pattern);

      if (matches) {
        for (const match of matches) {
          // Find line number
          const lines = content.slice(0, content.indexOf(match)).split("\n");
          const lineNumber = lines.length;

          findings.push({
            file: filePath,
            line: lineNumber,
            type: name,
            match: match.length > 50 ? match.slice(0, 47) + "..." : match,
          });
        }
      }
    }
  } catch (err) {
    // Skip binary files or unreadable files
    if (err.code !== "EISDIR") {
      // Silently skip
    }
  }

  return findings;
}

function main() {
  console.log("🔍 Scanning for secrets in tracked files...\n");

  const files = getTrackedFiles();
  const allFindings = [];

  for (const file of files) {
    if (shouldSkip(file)) continue;
    if (!fs.existsSync(file)) continue;

    const findings = scanFile(file);
    allFindings.push(...findings);
  }

  if (allFindings.length === 0) {
    console.log("✓ No secrets detected");
    process.exit(0);
  }

  console.error("✗ Potential secrets detected:\n");

  for (const finding of allFindings) {
    console.error(`  ${finding.file}:${finding.line}`);
    console.error(`    Type: ${finding.type}`);
    console.error(`    Match: ${finding.match}\n`);
  }

  console.error(`\nTotal: ${allFindings.length} potential secret(s) found.`);
  console.error("Please remove secrets from code and use environment variables instead.");
  process.exit(1);
}

main();
