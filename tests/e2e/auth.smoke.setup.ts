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

test("smoke-billing admin auth setup", async ({ page }) => {
  skipIfMissingEnv(test, ["AUTH_PASS_ADMIN"]);
  ensureAuthDir();
  await loginStaff(page, "admin", "/admin");
  await expect(page).toHaveURL(/\/(admin|office)(\/|$)/, { timeout: 15000 });
  await page.context().storageState({ path: adminStatePath });
});

test("smoke-billing resident auth setup", async ({ page }) => {
  // In dev mode, defaults to "1111" which is the built-in dev resident code
  // In prod mode with ENABLE_QA, uses TEST_ACCESS_CODE
  ensureAuthDir();
  await loginResidentByCode(page, "/cabinet");
  await expect(page).toHaveURL(/\/(cabinet|onboarding)(\/|$)/, { timeout: 15000 });
  await page.context().storageState({ path: residentStatePath });
});
