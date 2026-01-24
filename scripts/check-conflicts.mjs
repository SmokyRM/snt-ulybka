import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Split markers to avoid self-matching
const CONFLICT_MARKERS = ["<" + "<<<<<<", "=" + "======", ">" + ">>>>>>"];

function listTrackedFiles() {
  const output = execSync("git ls-files -z", { encoding: "utf8" });
  return output.split("\0").filter(Boolean);
}

function hasConflictMarkers(text) {
  return CONFLICT_MARKERS.some((marker) => text.includes(marker));
}

function main() {
  let bad = [];
  for (const file of listTrackedFiles()) {
    try {
      const text = readFileSync(file, "utf8");
      if (hasConflictMarkers(text)) {
        bad.push(file);
      }
    } catch {
      // Ignore unreadable files.
    }
  }

  if (bad.length > 0) {
    console.error("Conflict markers found in:\n" + bad.join("\n"));
    process.exit(1);
  }
}

main();
