import { test, expect, type Page } from "@playwright/test";
import { loginResidentByCode } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanCode = process.env.TEST_CHAIRMAN_CODE || "2222";
const secretaryCode = process.env.TEST_SECRETARY_CODE || "3333";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";

async function login(page: Page, code: string, next: string) {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
  await page.getByTestId("login-access-code").fill(code);
  const urlPattern = new RegExp(next.replace("/", "\\/") + "(\\/|$)", "i");
  await Promise.all([
    page.waitForURL(urlPattern, { timeout: 15000 }),
    page.getByTestId("login-submit").click(),
  ]);
}

test.describe("Office access", () => {
  test("chairman sees finance tile and can open finance", async ({ page }) => {
    await login(page, chairmanCode, "/office");
    await page.goto(`${base}/office/dashboard`);
    const financeTile = page.getByTestId("office-dashboard-tile-finance");
    await expect(financeTile).toBeVisible();
    await financeTile.click();
    await expect(page).toHaveURL(/\/office\/finance/);
  });

  test("secretary cannot open finance", async ({ page }) => {
    await login(page, secretaryCode, "/office");
    await page.goto(`${base}/office/finance`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("accountant cannot open announcements", async ({ page }) => {
    await login(page, accountantCode, "/office");
    await page.goto(`${base}/office/announcements`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
