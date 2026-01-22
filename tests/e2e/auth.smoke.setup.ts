import { test, expect } from "@playwright/test";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loginResidentByCode, loginStaff, skipIfMissingEnv } from "./helpers/auth";

const authDir = "test-results/.auth";
const adminStatePath = join(authDir, "smoke-admin.json");
const residentStatePath = join(authDir, "smoke-resident.json");

function ensureAuthDir() {
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }
}

// Check if at least one of the resident env vars is set
function hasResidentEnv(): boolean {
  return Boolean(process.env.TEST_ACCESS_CODE || process.env.AUTH_PASS_RESIDENT || process.env.USER_ACCESS_CODE);
}

test("smoke-billing admin auth setup", async ({ page }) => {
  skipIfMissingEnv(test, ["AUTH_PASS_ADMIN"]);
  ensureAuthDir();
  await loginStaff(page, "admin", "/admin");
  await expect(page).toHaveURL(/\/(admin|office)(\/|$)/, { timeout: 15000 });
  await page.context().storageState({ path: adminStatePath });
});

test("smoke-billing resident auth setup", async ({ page }) => {
  // Skip if neither TEST_ACCESS_CODE nor AUTH_PASS_RESIDENT is set
  if (!hasResidentEnv()) {
    test.skip(true, "Missing TEST_ACCESS_CODE or AUTH_PASS_RESIDENT");
  }
  ensureAuthDir();
  await loginResidentByCode(page, "/cabinet");
  await expect(page).toHaveURL(/\/(cabinet|onboarding)(\/|$)/, { timeout: 15000 });
  await page.context().storageState({ path: residentStatePath });
});
