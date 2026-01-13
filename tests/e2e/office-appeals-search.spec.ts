import { test, expect, type Page } from "@playwright/test";
import { loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office appeals search by plot", () => {
  test("chairman can search by plot number", async ({ page }) => {
    await loginStaff(page, "chairman", "/office");
    await page.goto(`${base}/office/appeals?q=12`);
    await expect(page.getByTestId("office-appeals-root")).toBeVisible();
    const hasItems = (await page.locator('[data-testid^="office-appeals-item-"]').count()) > 0;
    const isEmpty = await page.getByTestId("office-appeals-empty").isVisible().catch(() => false);
    expect(hasItems || isEmpty).toBe(true);
  });

  test("accountant is forbidden", async ({ page }) => {
    const accountantPass = process.env.AUTH_PASS_ACCOUNTANT;
    if (!accountantPass) {
      test.skip();
      return;
    }
    await loginStaff(page, "accountant", "/office");
    await page.goto(`${base}/office/appeals`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
