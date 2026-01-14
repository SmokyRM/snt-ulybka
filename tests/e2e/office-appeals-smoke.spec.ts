import { test, expect } from "@playwright/test";

test.use({ storageState: undefined });

test("office appeals requires staff auth", async ({ page }) => {
  await page.goto("/office/appeals");
  await expect(page.getByTestId("staff-login-root")).toBeVisible();
});
