import { test, expect } from "@playwright/test";

const staffPassword = process.env.AUTH_PASS_ACCOUNTANT;

test.describe("Office finance", () => {
  test.use({ storageState: undefined });

  test("finance доступен для сотрудника или показывает staff login", async ({ page }) => {
    if (staffPassword) {
      await page.goto("/staff-login");
      await page.getByTestId("staff-login-username").fill("бухгалтер");
      await page.getByTestId("staff-login-password").fill(staffPassword);
      await page.getByTestId("staff-login-submit").click();
      await page.goto("/office/finance");
      await expect(page.getByTestId("office-finance-root")).toBeVisible();
    } else {
      await page.goto("/office/finance");
      await expect(page.getByTestId("staff-login-root")).toBeVisible();
    }
  });
});
