import { test, expect, type Page } from "@playwright/test";
import { loginStaff, getStaffCreds } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office appeals (read-only)", () => {
  test("chairman can open appeals list and detail", async ({ page }) => {
    await loginStaff(page, "chairman", "/office");
    await page.goto(`${base}/office/appeals`);
    await expect(page.getByTestId("office-appeals-root")).toBeVisible();
    await page.goto(`${base}/office/appeals/a1`);
    await expect(page.getByTestId("office-appeal-root")).toBeVisible();
  });

  test("chairman can open appeal by stable seed ID (a1)", async ({ page }) => {
    await loginStaff(page, "chairman", "/office");
    await page.goto(`${base}/office/appeals/a1`);
    await expect(page.getByTestId("office-appeal-root")).toBeVisible();
    await expect(page.getByTestId("office-appeal-status")).toBeVisible();
    await expect(page).not.toHaveURL(/404/);
  });

  test("accountant is forbidden to open appeals", async ({ page }) => {
    const creds = getStaffCreds("accountant");
    const isCI = process.env.CI === "true";
    test.skip(!creds && !isCI, "AUTH_USER_ACCOUNTANT and AUTH_PASS_ACCOUNTANT are not set");
    await loginStaff(page, "accountant", "/office");
    await page.goto(`${base}/office/appeals`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
