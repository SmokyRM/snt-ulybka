import { test, expect, type Page } from "@playwright/test";
<<<<<<< HEAD
import { loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office access", () => {
  test.use({ storageState: undefined });

  test("chairman sees finance tile and can open finance", async ({ page }) => {
    const ok = await loginStaff(page, "chairman", "/office");
    test.skip(!ok, "No chairman creds in local env");
    // Diagnostic: check URL after login
    const afterLoginUrl = page.url();
    if (process.env.NODE_ENV !== "production") {
      console.log(`[office-access] After loginStaff, URL: ${afterLoginUrl}`);
    }
    // If we're not on /office, navigate there
    if (!afterLoginUrl.includes("/office")) {
      await page.goto(`${base}/office`);
      await page.waitForURL((url) => url.pathname.startsWith("/office") || url.pathname.startsWith("/staff-login") || url.pathname.startsWith("/forbidden"), { timeout: 10000 });
    }
    await page.goto(`${base}/office/dashboard`);
    const financeTile = page.getByTestId("office-dashboard-tile-finance");
    await expect(financeTile).toBeVisible();
    await financeTile.click();
=======

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanCode = process.env.TEST_CHAIRMAN_CODE || "2222";
const secretaryCode = process.env.TEST_SECRETARY_CODE || "3333";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";

async function login(page: Page, code: string, next: string) {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel(/код доступа/i).fill(code);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL(/^(?!.*login).*$/);
}

test.describe("Office access", () => {
  test("chairman sees finance tile and can open finance", async ({ page }) => {
    await login(page, chairmanCode, "/office");
    await page.goto(`${base}/office/dashboard`);
    await expect(page.getByRole("link", { name: /финансы/i })).toBeVisible();
    await page.getByRole("link", { name: /финансы/i }).click();
>>>>>>> 737c5be (codex snapshot)
    await expect(page).toHaveURL(/\/office\/finance/);
  });

  test("secretary cannot open finance", async ({ page }) => {
<<<<<<< HEAD
    const ok = await loginStaff(page, "secretary", "/office");
    test.skip(!ok, "No secretary creds in local env");
    // If we're not on /office, navigate there
    const afterLoginUrl = page.url();
    if (!afterLoginUrl.includes("/office") && !afterLoginUrl.includes("/forbidden")) {
      await page.goto(`${base}/office`);
      await page.waitForURL((url) => url.pathname.startsWith("/office") || url.pathname.startsWith("/staff-login") || url.pathname.startsWith("/forbidden"), { timeout: 10000 });
    }
=======
    await login(page, secretaryCode, "/office");
>>>>>>> 737c5be (codex snapshot)
    await page.goto(`${base}/office/finance`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("accountant cannot open announcements", async ({ page }) => {
<<<<<<< HEAD
    const ok = await loginStaff(page, "accountant", "/office");
    test.skip(!ok, "No accountant creds in local env");
=======
    await login(page, accountantCode, "/office");
>>>>>>> 737c5be (codex snapshot)
    await page.goto(`${base}/office/announcements`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
