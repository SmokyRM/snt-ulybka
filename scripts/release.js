#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync } = require("child_process");

const run = (cmd) => {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: "inherit" });
};

const runCapture = (cmd) => {
  console.log(`> ${cmd}`);
  return execSync(cmd, { encoding: "utf8" }).toString().trim();
};

const ensureClean = () => {
  const status = execSync("git status --porcelain", { encoding: "utf8" }).trim();
  if (status !== "") {
    console.error("Working tree не чистый. Commit/stash/reset перед деплоем.");
    process.exit(1);
  }
};

try {
  ensureClean();

  run("git checkout dev");
  run("git pull --rebase origin dev");
  run("npm run lint");
  run("npm run typecheck");
  run("npm run build");

  run("git checkout main");
  run("git pull origin main");
  run("git merge dev");
  run("git push origin main");

  run("git checkout dev");

  const devSha = runCapture("git rev-parse origin/dev");
  const mainSha = runCapture("git rev-parse origin/main");
  console.log(`DEV SHA: ${devSha}`);
  console.log(`MAIN SHA: ${mainSha}`);
  console.log("Pushed to main — Vercel will auto-deploy from Git.");
} catch (error) {
  console.error("Release failed:", error.message);
  process.exit(1);
}
