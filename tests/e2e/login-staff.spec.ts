import { test, expect } from "@playwright/test";

test("login page links to staff login", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /Войти для сотрудников/i }).click();
  await expect(page).toHaveURL(/\/staff-login/);
  await expect(page.getByTestId("staff-login-root")).toBeVisible();
});

test("staff login shows error on invalid credentials", async ({ page }) => {
  await page.goto("/staff-login");
  await page.getByTestId("staff-login-username").fill("админ");
  await page.getByTestId("staff-login-password").fill("wrong-pass");
  await page.getByTestId("staff-login-submit").click();
  await expect(page.getByTestId("staff-login-error")).toBeVisible();
});
