import { test, expect, type Page } from "@playwright/test";

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
