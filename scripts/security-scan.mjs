#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DANGEROUS_PATTERNS = [
  {
    regex: /dangerouslySetInnerHTML\s*=\s*\{/g,
    name: "dangerouslySetInnerHTML",
    severity: "warning",
    message: "Review XSS safety before using dangerouslySetInnerHTML.",
  },
  {
    regex: /\beval\s*\(/g,
    name: "eval()",
    severity: "error",
    message: "eval() is forbidden.",
  },
  {
    regex: /new\s+Function\s*\(/g,
    name: "new Function()",
    severity: "error",
    message: "new Function() is forbidden.",
  },
  {
    regex: /redirect\s*\(\s*(?:req|request|params|searchParams|query)\s*\.\s*\w+\s*\)/g,
    name: "unsafe redirect",
    severity: "error",
    message: "Potential open redirect with unsanitized input.",
  },
];

const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /coverage/,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /tests\//,
  /security-scan\.mjs$/,
  /security-scan\.ts$/,
];

const ALLOWLIST = [
  {
    file: /src\/lib\/optionalRequire\.ts$/,
    pattern: "new Function()",
  },
];

const shouldSkip = (filePath) => SKIP_PATTERNS.some((pattern) => pattern.test(filePath));

const getAllFiles = (dir) => {
  const files = [];
  const walk = (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (shouldSkip(fullPath)) continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.[jt]sx?$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };
  walk(dir);
  return files;
};

const scanFile = (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const findings = [];

  for (const pattern of DANGEROUS_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const lineNumber = content.slice(0, match.index).split("\n").length;
      findings.push({
        file: filePath,
        line: lineNumber,
        pattern: pattern.name,
        severity: pattern.severity,
        message: pattern.message,
        code: (lines[lineNumber - 1] || "").trim().slice(0, 120),
      });
    }
  }

  return findings.filter((finding) => {
    return !ALLOWLIST.some(
      (allow) => allow.pattern === finding.pattern && allow.file.test(finding.file),
    );
  });
};

const main = () => {
  const srcDirs = ["app", "src", "pages", "lib", "components"]
    .map((dir) => path.join(process.cwd(), dir))
    .filter((dir) => fs.existsSync(dir));

  const findings = [];
  for (const dir of srcDirs) {
    const files = getAllFiles(dir);
    for (const file of files) {
      findings.push(...scanFile(file));
    }
  }

  const errors = findings.filter((finding) => finding.severity === "error");
  const warnings = findings.filter((finding) => finding.severity === "warning");

  if (warnings.length) {
    console.log("Warnings:");
    for (const finding of warnings) {
      console.log(`  ${finding.file}:${finding.line} ${finding.pattern} — ${finding.message}`);
    }
  }

  if (errors.length) {
    console.error("Errors:");
    for (const finding of errors) {
      console.error(`  ${finding.file}:${finding.line} ${finding.pattern} — ${finding.message}`);
    }
    process.exit(1);
  }

  console.log(`security scan passed (${warnings.length} warning(s))`);
};

main();
