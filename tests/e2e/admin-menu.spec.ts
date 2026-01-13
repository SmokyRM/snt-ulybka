import { test, expect, type Page } from "@playwright/test";

const adminCode = process.env.TEST_ADMIN_CODE;

test.describe("Admin can open admin panel from home", () => {
  // start without user storageState to avoid inheriting resident session
<<<<<<< HEAD
  test.use({ storageState: undefined });
=======
  test.use({ storageState: {} as Record<string, unknown> });
>>>>>>> 737c5be (codex snapshot)

  test.skip(!adminCode, "TEST_ADMIN_CODE is not set for admin login");

  test("shows admin link on home and navigates to /admin", async ({ page }: { page: Page }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await page.goto(`${base}/login?next=/`);
<<<<<<< HEAD
    await page.getByTestId("login-access-code").fill(adminCode ?? "");
    await page.getByTestId("login-submit").click();
    await page.waitForURL(/\/$/, { timeout: 15000 });
=======
    await page.getByLabel(/код доступа/i).fill(adminCode ?? "");
    await page.getByRole("button", { name: /войти/i }).click();
    await page.waitForURL(/^(?!.*login).*$/);
>>>>>>> 737c5be (codex snapshot)
    await page.goto(`${base}/`);
    await page.getByRole("button", { name: /аккаунт/i }).click();
    await expect(page.getByRole("link", { name: /в админку/i })).toBeVisible();
    await page.getByRole("link", { name: /в админку/i }).click();
    await expect(page).toHaveURL(/\/admin/);
  });
});
