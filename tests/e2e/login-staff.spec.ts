import { test, expect } from "@playwright/test";

test.use({ storageState: undefined });

test("login page links to staff login", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  
  const link = page.getByRole("link", { name: /Войти для сотрудников/i });
  await expect(link).toBeVisible();
  
  // Use Promise.all to handle navigation properly
  await Promise.all([
    page.waitForURL(/\/staff-login/, { timeout: 15000 }),
    link.click(),
  ]);
  
  await expect(page.getByTestId("staff-login-root")).toBeVisible();
});

test("staff login shows error on invalid credentials", async ({ page }) => {
  await page.goto("/staff-login");
  await page.getByTestId("staff-login-username").fill("админ");
  await page.getByTestId("staff-login-password").fill("wrong-pass");
  await page.getByTestId("staff-login-submit").click();
  await expect(page.getByTestId("staff-login-error")).toBeVisible();
  await expect(page.getByTestId("staff-login-error-text")).toBeVisible();
});
