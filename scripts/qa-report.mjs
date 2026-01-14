#!/usr/bin/env node

import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Get git commit hash
let commitHash = "unknown";
try {
  commitHash = execSync("git rev-parse --short HEAD", { cwd: projectRoot, encoding: "utf-8" }).trim();
} catch (error) {
  console.warn("Warning: Could not get git commit hash:", error.message);
}

// Generate timestamp slug (YYYY-MM-DD_HH-mm)
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, "0");
const day = String(now.getDate()).padStart(2, "0");
const hours = String(now.getHours()).padStart(2, "0");
const minutes = String(now.getMinutes()).padStart(2, "0");
const slug = `${year}-${month}-${day}_${hours}-${minutes}`;

// Create output directories
const runsDir = join(projectRoot, "docs", "qa", "runs");
const assetsDir = join(runsDir, `${slug}_assets`);

if (!existsSync(runsDir)) {
  mkdirSync(runsDir, { recursive: true });
}
if (!existsSync(assetsDir)) {
  mkdirSync(assetsDir, { recursive: true });
}

// Get baseURL
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

console.log(`Running QA report test...`);
console.log(`Commit: ${commitHash}`);
console.log(`Base URL: ${baseURL}`);
console.log(`Output: ${assetsDir}`);

// Run Playwright test
let testExitCode = 1;
let testOutput = "";
try {
  testOutput = execSync(
    `npx playwright test tests/qa-report/admin-qa-report.spec.ts --reporter=line`,
    {
      cwd: projectRoot,
      encoding: "utf-8",
      env: {
        ...process.env,
        REPORT_OUT_DIR: assetsDir,
        PLAYWRIGHT_BASE_URL: baseURL,
      },
      stdio: "pipe",
    }
  );
  testExitCode = 0;
} catch (error) {
  testOutput = error.stdout || error.message;
  testExitCode = error.status || 1;
}

// Read test results if available
let results = null;
const resultsPath = join(assetsDir, "results.json");
if (existsSync(resultsPath)) {
  try {
    results = JSON.parse(readFileSync(resultsPath, "utf-8"));
  } catch (error) {
    console.warn("Warning: Could not read results.json:", error.message);
  }
}

// Determine final status
const finalStatus = testExitCode === 0 ? "PASS" : "FAIL";

// Generate markdown report
const reportPath = join(runsDir, `${slug}.md`);
const reportDate = now.toISOString().replace("T", " ").substring(0, 19);

let markdown = `# QA Report: Admin QA Tools

**Date:** ${reportDate}  
**Commit hash:** \`${commitHash}\`  
**Base URL:** ${baseURL.replace(/^https?:\/\//, "").replace(/:\d+$/, "")}  
**Status:** ${finalStatus === "PASS" ? "✅ PASS" : "❌ FAIL"}

---

`;

// Add RBAC table if we have results
if (results && results.scenarios && results.scenarios.length > 0) {
  markdown += `## RBAC Matrix

| Role | office-root | appeals | announcements | documents | finance | Notes |
|------|-------------|---------|---------------|-----------|--------|-------|
`;

  for (const scenario of results.scenarios) {
    const office = scenario.pages.office;
    const testids = office.testids || {};
    const officeRoot = testids["office-root"] ? "✅" : "❌";
    const appeals = testids["office-tile-appeals"] ? "✅" : "❌";
    const announcements = testids["office-tile-announcements"] ? "✅" : "❌";
    const documents = testids["office-tile-documents"] ? "✅" : "❌";
    const finance = testids["office-tile-finance"] ? "✅" : "❌";
    const notes = office.ok ? "" : `Error: ${office.error || "Failed"}`;

    markdown += `| ${scenario.role} | ${officeRoot} | ${appeals} | ${announcements} | ${documents} | ${finance} | ${notes} |\n`;
  }

  markdown += `\n---\n\n`;
}

// Add scenario details
if (results && results.scenarios && results.scenarios.length > 0) {
  markdown += `## Scenario Details\n\n`;

  for (const scenario of results.scenarios) {
    markdown += `### ${scenario.role}\n\n`;

    // Office page
    const office = scenario.pages.office;
    markdown += `#### Office Page\n`;
    markdown += `- **URL:** ${office.url}\n`;
    markdown += `- **Status:** ${office.ok ? "✅ OK" : "❌ FAIL"}\n`;
    if (office.testids) {
      markdown += `- **Test IDs:**\n`;
      for (const [testid, visible] of Object.entries(office.testids)) {
        markdown += `  - ${testid}: ${visible ? "✅" : "❌"}\n`;
      }
    }
    if (office.screenshot) {
      markdown += `- **Screenshot:** [office.png](./${slug}_assets/${office.screenshot})\n`;
    }
    if (office.error) {
      markdown += `- **Error:** ${office.error}\n`;
    }
    markdown += `\n`;

    // Other pages
    for (const [pageName, pageData] of Object.entries(scenario.pages)) {
      if (pageName === "office") continue;

      const pageLabel = pageName.charAt(0).toUpperCase() + pageName.slice(1);
      markdown += `#### ${pageLabel} Page\n`;
      markdown += `- **URL:** ${pageData.url}\n`;
      markdown += `- **Status:** ${pageData.ok ? "✅ OK" : "❌ FAIL"}\n`;
      if (pageData.screenshot) {
        markdown += `- **Screenshot:** [${pageName}.png](./${slug}_assets/${pageData.screenshot})\n`;
      }
      if (pageData.error) {
        markdown += `- **Error:** ${pageData.error}\n`;
      }
      markdown += `\n`;
    }
  }

  markdown += `---\n\n`;
}

// Add screenshots summary
if (results && results.scenarios) {
  markdown += `## Screenshots Summary\n\n`;
  for (const scenario of results.scenarios) {
    markdown += `### ${scenario.role}\n\n`;
    for (const [pageName, pageData] of Object.entries(scenario.pages)) {
      if (pageData.screenshot) {
        markdown += `- [${pageName}.png](./${slug}_assets/${pageData.screenshot})\n`;
      }
    }
    markdown += `\n`;
  }
}

// Add test output if failed
if (testExitCode !== 0) {
  markdown += `## Test Output\n\n\`\`\`\n${testOutput}\n\`\`\`\n\n`;
}

markdown += `---\n\n*Generated by \`npm run qa:report\`*\n`;

// Write report
writeFileSync(reportPath, markdown, "utf-8");

console.log(`\n✅ Report generated: ${reportPath}`);
console.log(`📁 Assets directory: ${assetsDir}`);
console.log(`\nStatus: ${finalStatus}`);

// Exit with test exit code
process.exit(testExitCode);
