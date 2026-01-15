import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("E2E Regression - Access Control", () => {
  test.describe("Guest redirects", () => {
    test.use({ storageState: undefined });

    test("guest /admin -> redirect /staff/login?next=/admin", async ({ page }) => {
      await page.goto(`${baseURL}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => {
        return url.pathname === "/staff/login" && url.searchParams.get("next") === "/admin";
      }, { timeout: 10000 });
      const url = page.url();
      expect(url).toContain("/staff/login");
      expect(url).toMatch(/next=.*admin/i);
    });

    test("guest /office -> redirect /staff/login?next=/office", async ({ page }) => {
      await page.goto(`${baseURL}/office`, { waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => {
        return url.pathname === "/staff/login" && url.searchParams.get("next")?.includes("/office");
      }, { timeout: 10000 });
      const url = page.url();
      expect(url).toContain("/staff/login");
      expect(url).toMatch(/next=.*office/i);
    });

    test("guest /cabinet -> redirect /login?next=/cabinet", async ({ page }) => {
      await page.goto(`${baseURL}/cabinet`, { waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => {
        return url.pathname === "/login" && url.searchParams.get("next") === "/cabinet";
      }, { timeout: 10000 });
      const url = page.url();
      expect(url).toContain("/login");
      expect(url).toMatch(/next=.*cabinet/i);
    });
  });

  test.describe("Admin access", () => {
    test.use({ storageState: undefined });

    test("admin login -> admin-shell visible", async ({ page }) => {
      await page.goto(`${baseURL}/staff/login`, { waitUntil: "domcontentloaded" });
      const adminCode = process.env.TEST_ADMIN_CODE || "1233";
      await page.fill('input[name="code"]', adminCode);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/admin", { timeout: 10000 });
      await expect(page.getByTestId("admin-shell")).toBeVisible();
      await expect(page.getByTestId("admin-quick-actions")).toBeVisible();
    });

    test("admin /cabinet -> redirect /forbidden", async ({ page }) => {
      // Логинимся как admin
      await page.goto(`${baseURL}/staff/login`, { waitUntil: "domcontentloaded" });
      const adminCode = process.env.TEST_ADMIN_CODE || "1233";
      await page.fill('input[name="code"]', adminCode);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/admin", { timeout: 10000 });
      
      // Пытаемся зайти в кабинет
      await page.goto(`${baseURL}/cabinet`, { waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => url.pathname === "/forbidden", { timeout: 10000 });
      await expect(page.getByTestId("forbidden-root")).toBeVisible();
    });
  });

  test.describe("Staff access", () => {
    test.use({ storageState: undefined });

    test("staff login -> office-shell visible", async ({ page }) => {
      await page.goto(`${baseURL}/staff/login`, { waitUntil: "domcontentloaded" });
      const chairmanUser = process.env.AUTH_USER_CHAIRMAN || "chairman";
      const chairmanPass = process.env.AUTH_PASS_CHAIRMAN || "password";
      await page.fill('input[name="username"]', chairmanUser);
      await page.fill('input[name="password"]', chairmanPass);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname.startsWith("/office"), { timeout: 10000 });
      await expect(page.getByTestId("office-shell")).toBeVisible();
    });

    test("staff /admin -> redirect /forbidden", async ({ page }) => {
      // Логинимся как staff
      await page.goto(`${baseURL}/staff/login`, { waitUntil: "domcontentloaded" });
      const chairmanUser = process.env.AUTH_USER_CHAIRMAN || "chairman";
      const chairmanPass = process.env.AUTH_PASS_CHAIRMAN || "password";
      await page.fill('input[name="username"]', chairmanUser);
      await page.fill('input[name="password"]', chairmanPass);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname.startsWith("/office"), { timeout: 10000 });
      
      // Пытаемся зайти в админку
      await page.goto(`${baseURL}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => url.pathname === "/forbidden", { timeout: 10000 });
      await expect(page.getByTestId("forbidden-root")).toBeVisible();
    });
  });

  test.describe("Resident access", () => {
    test.use({ storageState: undefined });

    test("resident login -> cabinet accessible", async ({ page }) => {
      // Логинимся как resident (через /login)
      await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
      const accessCode = process.env.TEST_ACCESS_CODE || "1111";
      await page.fill('input[name="code"]', accessCode);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/cabinet", { timeout: 10000 });
      
      // Проверяем что мы в кабинете
      const url = page.url();
      expect(url).toContain("/cabinet");
    });

    test("resident /admin -> redirect /forbidden", async ({ page }) => {
      // Логинимся как resident
      await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
      const accessCode = process.env.TEST_ACCESS_CODE || "1111";
      await page.fill('input[name="code"]', accessCode);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/cabinet", { timeout: 10000 });
      
      // Пытаемся зайти в админку
      await page.goto(`${baseURL}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForURL((url) => url.pathname === "/forbidden", { timeout: 10000 });
      await expect(page.getByTestId("forbidden-root")).toBeVisible();
    });
  });
});
