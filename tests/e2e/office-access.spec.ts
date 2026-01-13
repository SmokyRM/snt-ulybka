import { test, expect, type Page } from "@playwright/test";
import { loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office access", () => {
  test("chairman sees finance tile and can open finance", async ({ page }) => {
    await loginStaff(page, "chairman", "/office");
    await page.goto(`${base}/office/dashboard`);
    const financeTile = page.getByTestId("office-dashboard-tile-finance");
    await expect(financeTile).toBeVisible();
    await financeTile.click();
    await expect(page).toHaveURL(/\/office\/finance/);
  });

  test("secretary cannot open finance", async ({ page }) => {
    await loginStaff(page, "secretary", "/office");
    await page.goto(`${base}/office/finance`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("accountant cannot open announcements", async ({ page }) => {
    const loggedIn = await loginStaff(page, "accountant", "/office");
    test.skip(!loggedIn, "AUTH_USER_ACCOUNTANT and AUTH_PASS_ACCOUNTANT are not set");
    await page.goto(`${base}/office/announcements`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
