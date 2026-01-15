#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const resultsPath = join(projectRoot, "test-results", "access-matrix.json");

if (!existsSync(resultsPath)) {
  console.log("⚠️  access-matrix.json not found. Skipping summary.");
  process.exit(0);
}

let results;
try {
  const content = readFileSync(resultsPath, "utf-8");
  results = JSON.parse(content);
} catch (error) {
  console.error(`❌ Failed to parse ${resultsPath}:`, error.message);
  process.exit(1);
}

if (!Array.isArray(results)) {
  console.error(`❌ Expected array in ${resultsPath}`);
  process.exit(1);
}

// Filter FAIL results
// FAIL = verdict is UNEXPECTED (network errors, timeouts, etc.)
const failResults = results.filter((r) => r.verdict === "UNEXPECTED");
const failCount = failResults.length;

// Generate GitHub Actions summary
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  let summary = `# Access Matrix Results\n\n`;
  summary += `**Total checks:** ${results.length}\n`;
  summary += `**Failed:** ${failCount}\n`;
  summary += `**Passed:** ${results.length - failCount}\n\n`;

  if (failCount > 0) {
    summary += `## ❌ Failed Checks\n\n`;
    summary += `| Role | Route | Verdict | HTTP Status | Final URL |\n`;
    summary += `|------|-------|---------|--------------|----------|\n`;

    for (const fail of failResults) {
      summary += `| ${fail.role} | ${fail.route} | ${fail.verdict} | ${fail.httpStatus || "—"} | ${fail.finalUrl} |\n`;
    }

    summary += `\n### Details\n\n`;
    for (const fail of failResults) {
      summary += `- **${fail.role}** → \`${fail.route}\`: ${fail.verdict}`;
      if (fail.httpStatus) summary += ` (HTTP ${fail.httpStatus})`;
      if (fail.finalUrl !== fail.route) summary += ` → ${fail.finalUrl}`;
      summary += `\n`;
    }
  } else {
    summary += `## ✅ All checks passed\n\n`;
    summary += `All ${results.length} access matrix checks completed successfully.\n`;
  }

  const fs = await import("fs/promises");
  await fs.writeFile(summaryPath, summary, "utf-8");
  console.log(`\n📊 Summary written to GitHub Actions step summary`);
}

// Console output
console.log(`\n📊 Access Matrix Summary`);
console.log(`Total checks: ${results.length}`);
console.log(`Passed: ${results.length - failCount}`);
console.log(`Failed: ${failCount}`);

if (failCount > 0) {
  console.log(`\n❌ Failed checks:`);
  for (const fail of failResults) {
    console.log(`  - ${fail.role} → ${fail.route}: ${fail.verdict} (${fail.httpStatus || "—"}) → ${fail.finalUrl}`);
  }
  console.log(`\n❌ Access matrix check failed with ${failCount} errors`);
  process.exit(1);
} else {
  console.log(`\n✅ All access matrix checks passed`);
  process.exit(0);
}
