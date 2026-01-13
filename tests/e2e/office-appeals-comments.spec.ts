import { test, expect, type Page } from "@playwright/test";
import { loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office appeals comments", () => {
  test("chairman can add comment", async ({ page }) => {
    await loginStaff(page, "chairman", "/office");
    await page.goto(`${base}/office/appeals/a1`);
    await expect(page.getByTestId("office-appeal-root")).toBeVisible();
    await page.getByTestId("appeal-comment-text").fill("Тестовый коммент");
    await page.getByTestId("appeal-comment-submit").click();
    await expect(page.getByTestId("appeal-comments")).toContainText("Тестовый коммент");
  });

  test("accountant is forbidden to see appeals", async ({ page }) => {
    const loggedIn = await loginStaff(page, "accountant", "/office");
    test.skip(!loggedIn, "AUTH_USER_ACCOUNTANT and AUTH_PASS_ACCOUNTANT are not set");
    await page.goto(`${base}/office/appeals`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
