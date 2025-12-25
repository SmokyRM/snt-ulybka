#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const run = (cmd, env) => {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
};

const runCapture = (cmd, env) => {
  console.log(`> ${cmd}`);
  return execSync(cmd, { encoding: "utf8", env: { ...process.env, ...env } }).toString().trim();
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || process.env.DRY_RUN === "1";
const currentBranch = runCapture("git rev-parse --abbrev-ref HEAD");
const lastDeployFile = path.join(process.cwd(), ".vercel", "last_deploy_sha");

const ensureClean = () => {
  const status = runCapture("git status --porcelain");
  if (status !== "") {
    const msg =
      "Есть незакоммиченные изменения. Commit, stash, or reset changes before deploy.";
    if (dryRun) {
      console.warn(`WARN: ${msg} (dry-run продолжается)`);
      return;
    }
    throw new Error(msg);
  }
};

const readLastSha = () => {
  try {
    return fs.readFileSync(lastDeployFile, "utf8").trim();
  } catch {
    return null;
  }
};

const writeLastSha = (sha) => {
  const dir = path.dirname(lastDeployFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(lastDeployFile, `${sha}\n`, "utf8");
};

const triggerVercelProdDeploy = (prodShaVal) => {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error("VERCEL_TOKEN не задан, пропускаю prod deploy через Vercel CLI.");
    return;
  }
  const env = { VERCEL_TOKEN: token };
  if (process.env.VERCEL_ORG_ID) env.VERCEL_ORG_ID = process.env.VERCEL_ORG_ID;
  if (process.env.VERCEL_PROJECT_ID) env.VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  if (process.env.VERCEL_SCOPE) env.VERCEL_SCOPE = process.env.VERCEL_SCOPE;

  runCapture("npx vercel pull --yes --environment=production --token $VERCEL_TOKEN", env);
  const output = runCapture("npx vercel deploy --prod --yes --token $VERCEL_TOKEN", env);
  console.log(output);
  console.log("Vercel prod deploy triggered. SHA:", prodShaVal);
};

const currentSha = runCapture("git rev-parse HEAD");
console.log(`Current branch: ${currentBranch}`);
console.log(`Current SHA: ${currentSha}`);

const lastSha = readLastSha();
if (lastSha && lastSha === currentSha && !dryRun) {
  console.log("No changes since last deploy, skipping deploy.");
  process.exit(0);
}

try {
  ensureClean();

  if (dryRun) {
    console.log("Dry run mode: команды не выполняются, только план.");
    if (currentBranch !== "dev" && currentBranch !== "main") {
      console.warn("Предупреждение: запуск не из dev/main (dry-run продолжится).");
    }
    console.log("Планируемые шаги:");
    if (currentBranch === "dev") {
      console.log(
        "- pull --rebase origin dev -> lint/typecheck/build -> push dev -> checkout main -> pull main -> merge dev -> push main (или пустой коммит) -> vercel deploy"
      );
    } else if (currentBranch === "main") {
      console.log("- vercel pull production -> vercel deploy --prod");
    }
    console.log(`Последний задеплоенный SHA: ${lastSha || "нет данных"}`);
    console.log(`Текущий SHA: ${currentSha}`);
    process.exit(0);
  }

  if (currentBranch === "dev") {
    run("git pull --rebase origin dev");
    run("npm run lint");
    run("npm run typecheck");
    run("npm run build");
    run("git push origin dev");

    run("git checkout main");
    run("git pull --rebase origin main");
    run("git merge dev");

    let pushed = false;
    let prodSha = "";
    try {
      run("git push origin main");
      prodSha = runCapture("git rev-parse HEAD");
      pushed = true;
      console.log("main updated and pushed.");
    } catch (e) {
      const msg = String(e?.message ?? "");
      if (msg.includes("Everything up-to-date") || msg.includes("up to date")) {
        console.log("main уже содержит все изменения. Создаю пустой коммит для прод-деплоя...");
        run('git commit --allow-empty -m "chore: trigger vercel prod deploy"');
        run("git push origin main");
        prodSha = runCapture("git rev-parse HEAD");
        pushed = true;
        console.log("Пустой коммит отправлен, Vercel запустит прод деплой.");
      } else {
        throw e;
      }
    }

    if (!pushed) {
      throw new Error("Не удалось запушить main");
    }

    if (prodSha) {
      console.log("\n🚀 Production SHA (main):", prodSha);
      writeLastSha(prodSha);
    }
    triggerVercelProdDeploy(prodSha);
    run("git checkout dev");
    console.log("Prod deploy выполнен из dev → main.");
  } else if (currentBranch === "main") {
    console.log("\n🚀 Production SHA (main):", currentSha);
    triggerVercelProdDeploy(currentSha);
    writeLastSha(currentSha);
    console.log("Prod deploy выполнен из main.");
  } else {
    throw new Error("Release aborted: текущая ветка должна быть dev или main.");
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

