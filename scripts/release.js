#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync } = require("child_process");

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const runCapture = (cmd, env) =>
  execSync(cmd, { encoding: "utf8", env: { ...process.env, ...env } }).toString().trim();

const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
  encoding: "utf8",
}).trim();

if (currentBranch !== "dev") {
  console.error("Release aborted: текущая ветка должна быть dev.");
  process.exit(1);
}

let prodSha = "";

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
    prodSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    pushed = true;
    console.log("main updated and pushed.");
  } catch (e) {
    const msg = String(e?.message ?? "");
    if (msg.includes("Everything up-to-date") || msg.includes("up to date")) {
      console.log("main уже содержит все изменения. Создаю пустой коммит для прод-деплоя...");
      run('git commit --allow-empty -m "chore: trigger vercel prod deploy"');
      run("git push origin main");
      prodSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
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
  }

  triggerVercelProdDeploy(prodSha);
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

function triggerVercelProdDeploy(prodShaVal) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error("VERCEL_TOKEN не задан, пропускаю prod deploy через Vercel CLI.");
    return;
  }
  const env = { VERCEL_TOKEN: token };
  if (process.env.VERCEL_ORG_ID) env.VERCEL_ORG_ID = process.env.VERCEL_ORG_ID;
  if (process.env.VERCEL_PROJECT_ID) env.VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  if (process.env.VERCEL_SCOPE) env.VERCEL_SCOPE = process.env.VERCEL_SCOPE;

  try {
    console.log("Запускаю vercel pull (production env)...");
    runCapture("npx vercel pull --yes --environment=production --token $VERCEL_TOKEN", env);
    console.log("Запускаю vercel deploy --prod...");
    const output = runCapture("npx vercel deploy --prod --yes --token $VERCEL_TOKEN", env);
    console.log(output);
    console.log("Vercel prod deploy triggered. SHA:", prodShaVal);
  } catch (e) {
    console.error("Vercel deploy failed:", String(e?.message || e));
  }
}

