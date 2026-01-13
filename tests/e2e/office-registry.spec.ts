import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanPass = process.env.AUTH_PASS_CHAIRMAN || "";
const accountantPass = process.env.AUTH_PASS_ACCOUNTANT || "";
const residentCode = process.env.TEST_ACCESS_CODE || "1111";

test.describe("Office registry", () => {
  test("accountant can open registry and item", async ({ page }) => {
    const staffPassword = chairmanPass || accountantPass;
    if (!staffPassword) {
      await page.goto(`${base}/staff-login`);
      await expect(page.getByTestId("staff-login-root")).toBeVisible();
      return;
    }
    const loginValue = chairmanPass ? "Председатель" : "Бухгалтер";
    await page.goto(`${base}/staff-login?next=${encodeURIComponent("/office/registry")}`);
    await page.getByTestId("staff-login-username").fill(loginValue);
    await page.getByTestId("staff-login-password").fill(staffPassword);
    await page.getByTestId("staff-login-submit").click();
    await page.waitForURL(/\/office\/registry/);
    await expect(page.getByTestId("office-registry-root")).toBeVisible();
    const firstRow = page.getByTestId("registry-row").first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();
    await expect(page).toHaveURL(new RegExp("/office/registry/"));
    await expect(page.getByTestId("office-registry-item-root")).toBeVisible();
    await page.getByTestId("registry-open-finance").click();
    await expect(page).toHaveURL(/\/office\/finance/);
  });

  test("resident gets forbidden", async ({ page }) => {
    await page.goto(`${base}/login?next=${encodeURIComponent("/office/registry")}`);
    await page.getByTestId("login-access-code").fill(residentCode);
    await Promise.all([
      page.waitForURL(/\/office\/registry/, { timeout: 15000 }),
      page.getByTestId("login-submit").click(),
    ]);
    await expect(page).toHaveURL(/forbidden/);
  });
});
