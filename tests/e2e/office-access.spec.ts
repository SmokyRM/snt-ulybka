import { test, expect, type Page } from "@playwright/test";
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
    await expect(page).toHaveURL(/\/office\/finance/);
  });

  test("secretary cannot open finance", async ({ page }) => {
    const ok = await loginStaff(page, "secretary", "/office");
    test.skip(!ok, "No secretary creds in local env");
    // If we're not on /office, navigate there
    const afterLoginUrl = page.url();
    if (!afterLoginUrl.includes("/office") && !afterLoginUrl.includes("/forbidden")) {
      await page.goto(`${base}/office`);
      await page.waitForURL((url) => url.pathname.startsWith("/office") || url.pathname.startsWith("/staff-login") || url.pathname.startsWith("/forbidden"), { timeout: 10000 });
    }
    await page.goto(`${base}/office/finance`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("accountant cannot open announcements", async ({ page }) => {
    const ok = await loginStaff(page, "accountant", "/office");
    test.skip(!ok, "No accountant creds in local env");
    await page.goto(`${base}/office/announcements`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
