import { test, expect } from "@playwright/test";

test("warmup dev pages", async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto("/");
  await expect(page.getByTestId("home-cta-login")).toBeVisible({ timeout: 120_000 });

  await page.goto("/login");
  await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 120_000 });

  await page.goto("/staff-login");
  await expect(page.getByTestId("staff-login-root")).toBeVisible({ timeout: 120_000 });
});
