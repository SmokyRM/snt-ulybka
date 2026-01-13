import { test, expect, type Page } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanCode = process.env.TEST_CHAIRMAN_CODE || "2222";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";

async function login(page: Page, code: string, next: string) {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel(/код доступа/i).fill(code);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL(/^(?!.*login).*$/);
}

test.describe("Office appeals search by plot", () => {
  test("chairman can search by plot number", async ({ page }) => {
    await login(page, chairmanCode, "/office/appeals?q=12");
    await page.goto(`${base}/office/appeals?q=12`);
    await expect(page.getByTestId("office-appeals-root")).toBeVisible();
    await expect(page.getByTestId("appeals-list-item").first()).toBeVisible();
  });

  test("accountant is forbidden", async ({ page }) => {
    await login(page, accountantCode, "/office/appeals?q=12");
    await page.goto(`${base}/office/appeals?q=12`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
