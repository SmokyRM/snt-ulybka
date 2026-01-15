import { test, expect } from "@playwright/test";

const staffPassword = process.env.AUTH_PASS_ACCOUNTANT;

test.use({ storageState: undefined });

test("office appeals accessible for staff or shows staff login", async ({ page }) => {
  if (staffPassword) {
    await page.goto("/staff-login");
    await page.getByTestId("staff-login-username").fill("бухгалтер");
    await page.getByTestId("staff-login-password").fill(staffPassword);
    await page.getByTestId("staff-login-submit").click();
    await page.goto("/office/appeals");
    await expect(page.getByTestId("office-appeals-root")).toBeVisible();
  } else {
    await page.goto("/office/appeals");
    await expect(page.getByTestId("staff-login-root")).toBeVisible();
  }
});
