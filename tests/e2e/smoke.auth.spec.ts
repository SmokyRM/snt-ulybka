import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Smoke E2E тесты - авторизация и редиректы", () => {
  test.describe("Guest redirects", () => {
    test.use({ storageState: undefined });

    test("guest admin redirect: /admin -> /staff/login?next=/admin", async ({ page }) => {
      await page.goto(`${baseURL}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => {
        return url.pathname === "/staff/login" && url.searchParams.get("next") === "/admin";
      }, { timeout: 10000 });
      const url = page.url();
      expect(url).toContain("/staff/login");
      expect(url).toMatch(/next=.*admin/i);
    });

    test("guest cabinet redirect: /cabinet -> /login?next=/cabinet", async ({ page }) => {
      await page.goto(`${baseURL}/cabinet`, { waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => {
        return url.pathname === "/login" && url.searchParams.get("next") === "/cabinet";
      }, { timeout: 10000 });
      const url = page.url();
      expect(url).toContain("/login");
      expect(url).toMatch(/next=.*cabinet/i);
    });
  });

  test.describe("Admin login flow", () => {
    test.use({ storageState: undefined });

    test("admin login -> admin-shell", async ({ page }) => {
      // Переходим на страницу логина
      await page.goto(`${baseURL}/staff/login`, { waitUntil: "domcontentloaded" });
      
      // Заполняем форму (используем тестовые данные если доступны)
      const adminCode = process.env.TEST_ADMIN_CODE || "1233";
      await page.fill('input[name="code"]', adminCode);
      
      // Отправляем форму
      await page.click('button[type="submit"]');
      
      // Ждем редирект на /admin
      await page.waitForURL((url) => url.pathname === "/admin", { timeout: 10000 });
      
      // Проверяем что мы на админке и есть admin-shell
      await expect(page.getByTestId("admin-root")).toBeVisible();
      await expect(page.getByTestId("admin-quick-actions")).toBeVisible();
    });
  });

  test.describe("Staff login flow", () => {
    test.use({ storageState: undefined });

    test("staff login -> office-shell", async ({ page }) => {
      // Переходим на страницу логина
      await page.goto(`${baseURL}/staff/login`, { waitUntil: "domcontentloaded" });
      
      // Заполняем форму (используем тестовые данные если доступны)
      const chairmanUser = process.env.AUTH_USER_CHAIRMAN || "chairman";
      const chairmanPass = process.env.AUTH_PASS_CHAIRMAN || "password";
      
      await page.fill('input[name="username"]', chairmanUser);
      await page.fill('input[name="password"]', chairmanPass);
      
      // Отправляем форму
      await page.click('button[type="submit"]');
      
      // Ждем редирект на /office
      await page.waitForURL((url) => url.pathname.startsWith("/office"), { timeout: 10000 });
      
      // Проверяем что мы в офисе и есть office-shell
      await expect(page.getByTestId("office-shell")).toBeVisible();
    });
  });
});
