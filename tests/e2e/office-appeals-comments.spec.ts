import { test, expect, type Page } from "@playwright/test";
<<<<<<< HEAD
import { loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office appeals comments", () => {
  test.use({ storageState: undefined });

  test("chairman can add comment", async ({ page }) => {
    await loginStaff(page, "chairman", "/office");
    await page.goto(`${base}/office/appeals/a1`);
=======

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanCode = process.env.TEST_CHAIRMAN_CODE || "2222";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";

async function login(page: Page, code: string, next: string) {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel(/код доступа/i).fill(code);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL(/^(?!.*login).*$/);
}

test.describe("Office appeals comments", () => {
  test("chairman can add comment", async ({ page }) => {
    await login(page, chairmanCode, "/office/appeals");
    await page.goto(`${base}/office/appeals`);
    await expect(page.getByTestId("office-appeals-root")).toBeVisible();
    const firstItem = page.getByRole("link").first();
    await firstItem.click();
>>>>>>> 737c5be (codex snapshot)
    await expect(page.getByTestId("office-appeal-root")).toBeVisible();
    await page.getByTestId("appeal-comment-text").fill("Тестовый коммент");
    await page.getByTestId("appeal-comment-submit").click();
    await expect(page.getByTestId("appeal-comments")).toContainText("Тестовый коммент");
  });

  test("accountant is forbidden to see appeals", async ({ page }) => {
<<<<<<< HEAD
    const ok = await loginStaff(page, "accountant", "/office");
    test.skip(!ok, "No accountant creds in local env");
=======
    await login(page, accountantCode, "/office/appeals");
>>>>>>> 737c5be (codex snapshot)
    await page.goto(`${base}/office/appeals`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
