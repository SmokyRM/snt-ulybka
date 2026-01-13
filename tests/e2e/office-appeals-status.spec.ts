import { test, expect, type Page } from "@playwright/test";
import { loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office appeals status action", () => {
  test("chairman can change status", async ({ page }) => {
    await loginStaff(page, "chairman", "/office");
    await page.goto(`${base}/office/appeals/a1`);
    await expect(page.getByTestId("office-appeal-root")).toBeVisible();
    await page.locator('[data-testid="appeal-status-select"]').selectOption({ value: "in_progress" });
    await page.getByTestId("appeal-status-submit").click();
    await expect(page.getByTestId("appeal-status")).toContainText(/В работе/i);
  });

  test("accountant is forbidden", async ({ page }) => {
    const loggedIn = await loginStaff(page, "accountant", "/office");
    test.skip(!loggedIn, "AUTH_USER_ACCOUNTANT and AUTH_PASS_ACCOUNTANT are not set");
    await page.goto(`${base}/office/appeals`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
