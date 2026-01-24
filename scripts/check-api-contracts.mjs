import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const scopes = ["app/admin", "app/(office)", "app/(cabinet)", "app/(public)"];
const pattern = "(\\.json\\s*\\()|(\\bjson\\.ok\\b)|(\\bpayload\\.ok\\b)|(\\bdata\\.ok\\b)";
const rgArgs = [
  "--column",
  "-n",
  "--hidden",
  "--glob",
  "!node_modules/**",
  "--glob",
  "!.next/**",
  pattern,
  ...scopes,
];

function runRg() {
  try {
    return execFileSync("rg", rgArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 1) {
      return "";
    }
    throw error;
  }
}

function isAllowedContent(content) {
  const allowRawMarkers = ["apiGetRaw", "apiPostRaw", "readRaw"];
  if (allowRawMarkers.some((marker) => content.includes(marker))) {
    return true;
  }
  const allowEndpointPatterns = [
    /\/api\/auth\b/,
    /\/api\/uploads\b/,
    /\/api\/plots\b/,
    /\/api\/documents\b/,
    /\/api\/files\b/,
  ];
  return allowEndpointPatterns.some((regex) => regex.test(content));
}

const output = runRg();
if (!output) {
  process.exit(0);
}

const violations = [];
const cache = new Map();

for (const line of output.split("\n")) {
  if (!line.trim()) continue;
  const first = line.indexOf(":");
  const second = line.indexOf(":", first + 1);
  const third = line.indexOf(":", second + 1);
  if (first === -1 || second === -1 || third === -1) continue;
  const file = line.slice(0, first);
  if (file.endsWith("/route.ts") || file.endsWith("/route.tsx")) {
    continue;
  }
  const lineNum = line.slice(first + 1, second);
  const col = line.slice(second + 1, third);
  const snippet = line.slice(third + 1).trim();

  let content = cache.get(file);
  if (content === undefined) {
    try {
      content = readFileSync(file, "utf8");
    } catch {
      content = "";
    }
    cache.set(file, content);
  }

  if (isAllowedContent(content)) continue;
  violations.push({ file, lineNum, col, snippet });
}

if (violations.length) {
  console.error("API contract check failed. Use readOk/apiGet/apiPost (or raw helpers for exceptions).");
  for (const v of violations) {
    console.error(`${v.file}:${v.lineNum}:${v.col} ${v.snippet}`);
  }
  process.exit(1);
}
