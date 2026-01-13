import { test, expect, type Page } from "@playwright/test";
import { loginResidentByCode } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanCode = process.env.TEST_CHAIRMAN_CODE || "2222";
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

test.describe("Office appeals comments", () => {
  test("chairman can add comment", async ({ page }) => {
    await login(page, chairmanCode, "/office/appeals");
    await page.goto(`${base}/office/appeals`);
    await expect(page.getByTestId("office-appeals-root")).toBeVisible();
    const firstItem = page.getByRole("link").first();
    await firstItem.click();
    await expect(page.getByTestId("office-appeal-root")).toBeVisible();
    await page.getByTestId("appeal-comment-text").fill("Тестовый коммент");
    await page.getByTestId("appeal-comment-submit").click();
    await expect(page.getByTestId("appeal-comments")).toContainText("Тестовый коммент");
  });

  test("accountant is forbidden to see appeals", async ({ page }) => {
    await login(page, accountantCode, "/office/appeals");
    await page.goto(`${base}/office/appeals`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
