#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync } = require("child_process");

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
  encoding: "utf8",
}).trim();

if (currentBranch !== "dev") {
  console.error("Release aborted: текущая ветка должна быть dev.");
  process.exit(1);
}

try {
  run("git pull --rebase origin dev");
  run("npm run lint");
  run("npm run typecheck");
  run("npm run build");
  run("git push origin dev");

  run("git checkout main");
  run("git pull --rebase origin main");
  run("git merge dev");

  let pushed = false;
  try {
    run("git push origin main");
    pushed = true;
    console.log("main updated and pushed.");
  } catch (e) {
    const msg = String(e?.message ?? "");
    if (msg.includes("Everything up-to-date") || msg.includes("up to date")) {
      console.log("main уже содержит все изменения. Создаю пустой коммит для прод-деплоя...");
      run('git commit --allow-empty -m "chore: trigger vercel prod deploy"');
      run("git push origin main");
      pushed = true;
      console.log("Пустой коммит отправлен, Vercel запустит прод деплой.");
    } else {
      throw e;
    }
  }

  if (!pushed) {
    throw new Error("Не удалось запушить main");
  }
} catch (error) {
  console.error("Release failed:", error.message);
  try {
    run("git checkout dev");
  } catch {
    // ignore
  }
  process.exit(1);
}

try {
  run("git checkout dev");
} catch {
  // ignore
}

try {
  const prodSha = require("child_process")
    .execSync("git rev-parse HEAD", { encoding: "utf8" })
    .toString()
    .trim();
  console.log("\n🚀 Production SHA:", prodSha);
} catch {
  // ignore
}
