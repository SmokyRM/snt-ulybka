import { test, expect } from "@playwright/test";
import { loginResidentByCode, loginStaff, skipIfMissingEnv } from "./helpers/auth";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test("guest: /office -> /staff/login", async ({ page }) => {
  await page.goto(`${baseURL}/office`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/staff\/login/, { timeout: 15000 });
  await expect(page.getByTestId("staff-login-form")).toBeVisible({ timeout: 10000 });
});

test("guest: /cabinet -> /login", async ({ page }) => {
  await page.goto(`${baseURL}/cabinet`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 10000 });
});

test("resident: /cabinet ok; /office forbidden", async ({ page }) => {
  await loginResidentByCode(page, "/cabinet");
  await expect(page).toHaveURL(/\/(cabinet|onboarding)(\/|$)/, { timeout: 15000 });
  await expect(page.getByTestId("cabinet-root")).toBeVisible({ timeout: 15000 });

  await page.goto(`${baseURL}/office`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/forbidden/, { timeout: 15000 });
  await expect(page.getByTestId("forbidden-root")).toBeVisible({ timeout: 10000 });
});

test("chairman: /office ok; /admin/billing ok; /admin/settings forbidden", async ({ page }) => {
  skipIfMissingEnv(test, ["AUTH_PASS_CHAIRMAN"]);
  await loginStaff(page, "chairman", "/office");
  await expect(page).toHaveURL(/\/office(\/|$)/, { timeout: 15000 });
  await expect(page.getByTestId("office-root")).toBeVisible({ timeout: 10000 });

  await page.goto(`${baseURL}/admin/billing`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/admin\/billing(\/|$)/, { timeout: 15000 });
  await expect(page.getByTestId("admin-root")).toBeVisible({ timeout: 10000 });

  await page.goto(`${baseURL}/admin/settings`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/forbidden/, { timeout: 15000 });
  await expect(page.getByTestId("forbidden-root")).toBeVisible({ timeout: 10000 });
});

test("admin: /admin/settings ok", async ({ page }) => {
  skipIfMissingEnv(test, ["AUTH_PASS_ADMIN"]);
  await loginStaff(page, "admin", "/admin/settings");
  await expect(page).toHaveURL(/\/admin\/settings(\/|$)/, { timeout: 15000 });
  await expect(page.getByTestId("admin-root")).toBeVisible({ timeout: 10000 });
});
