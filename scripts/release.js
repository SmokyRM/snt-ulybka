#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { execSync } = require("child_process");

const safeCapture = (cmd) => {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
};

const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || safeCapture("git rev-parse HEAD") || "unknown";
const branch =
  process.env.VERCEL_GIT_COMMIT_REF || safeCapture("git rev-parse --abbrev-ref HEAD") || "unknown";
const vercelEnv = process.env.VERCEL_ENV || "unknown";

console.log("Deploy info (no Git/Vercel operations performed):");
console.log(`🚀 Build/Commit SHA: ${commitSha}`);
console.log(`Branch: ${branch}`);
console.log(`Vercel Env: ${vercelEnv}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
