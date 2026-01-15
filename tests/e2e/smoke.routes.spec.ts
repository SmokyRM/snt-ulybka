import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Smoke E2E тесты - основные маршруты", () => {
  test.describe("Public маршруты", () => {
    test.use({ storageState: undefined });

    test("GET / -> 200", async ({ page }) => {
      const response = await page.goto(baseURL, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
    });

    test("GET /login -> 200, есть data-testid='login-form'", async ({ page }) => {
      const response = await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await expect(page.getByTestId("login-form")).toBeVisible();
    });

    test("GET /staff/login -> 200, есть data-testid='staff-login-form'", async ({ page }) => {
      const response = await page.goto(`${baseURL}/staff/login`, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await expect(page.getByTestId("staff-login-form")).toBeVisible();
    });

    test("GET /staff-login -> 200, есть data-testid='staff-login-form'", async ({ page }) => {
      const response = await page.goto(`${baseURL}/staff-login`, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await expect(page.getByTestId("staff-login-form")).toBeVisible();
    });
  });

  test.describe("Cabinet маршруты", () => {
    test.use({ storageState: undefined });

    test("GET /cabinet без auth -> редирект на /login?next=/cabinet", async ({ page }) => {
      await page.goto(`${baseURL}/cabinet`, { waitUntil: "domcontentloaded" });
      // Проверяем редирект на /login с параметром next (URL может быть закодирован)
      await page.waitForURL((url) => {
        return url.pathname === "/login" && url.searchParams.get("next") === "/cabinet";
      }, { timeout: 10000 });
      // Проверяем что мы на /login и есть параметр next (может быть закодирован как %2Fcabinet)
      const url = page.url();
      expect(url).toContain("/login");
      expect(url).toMatch(/next=.*cabinet/i);
      await expect(page.getByTestId("login-form")).toBeVisible();
    });

    test("GET /cabinet?qa=resident_ok -> 200, есть data-testid='cabinet-page-root'", async ({ page }) => {
      // QA override работает только в dev
      const isDev = process.env.NODE_ENV !== "production";
      const qaEnabled = process.env.ENABLE_QA === "true";
      test.skip(!isDev || !qaEnabled, "QA override доступен только в dev с ENABLE_QA=true");

      await page.goto(`${baseURL}/cabinet?qa=resident_ok`, { waitUntil: "domcontentloaded" });
      // Ждем загрузки страницы (может быть редирект или рендер)
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      
      // Проверяем что мы на /cabinet (не редиректнуло на /login)
      const url = page.url();
      expect(url).toContain("/cabinet");
      
      // Проверяем наличие корневого testid
      await expect(page.getByTestId("cabinet-page-root")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Office маршруты", () => {
    test.use({ storageState: undefined });

    test("GET /office/dashboard без auth -> редирект на /staff/login?next=...", async ({ page }) => {
      await page.goto(`${baseURL}/office/dashboard`, { waitUntil: "domcontentloaded" });
      // Проверяем редирект на /staff/login с параметром next
      await page.waitForURL((url) => {
        const path = url.pathname;
        return (path === "/staff/login" || path === "/staff-login") && 
               url.searchParams.has("next");
      }, { timeout: 10000 });
      
      const currentUrl = page.url();
      // Проверяем что URL содержит staff/login или staff-login
      expect(currentUrl).toMatch(/\/staff[\/-]login/i);
      expect(currentUrl).toContain("next=");
    });

    test("GET /office/dashboard?qa=chairman -> 200, есть data-testid='office-shell'", async ({ page }) => {
      const isDev = process.env.NODE_ENV !== "production";
      const qaEnabled = process.env.ENABLE_QA === "true";
      test.skip(!isDev || !qaEnabled, "QA override доступен только в dev с ENABLE_QA=true");

      await page.goto(`${baseURL}/office/dashboard?qa=chairman`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      
      // Проверяем что мы на /office (не редиректнуло на /staff-login)
      const url = page.url();
      expect(url).toContain("/office");
      
      // Проверяем наличие office-shell
      await expect(page.getByTestId("office-shell")).toBeVisible({ timeout: 10000 });
    });

    test("GET /office/dashboard?qa=secretary -> 200, есть data-testid='office-shell'", async ({ page }) => {
      const isDev = process.env.NODE_ENV !== "production";
      const qaEnabled = process.env.ENABLE_QA === "true";
      test.skip(!isDev || !qaEnabled, "QA override доступен только в dev с ENABLE_QA=true");

      await page.goto(`${baseURL}/office/dashboard?qa=secretary`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      
      const url = page.url();
      expect(url).toContain("/office");
      await expect(page.getByTestId("office-shell")).toBeVisible({ timeout: 10000 });
    });

    test("GET /office/dashboard?qa=accountant -> 200, есть data-testid='office-shell'", async ({ page }) => {
      const isDev = process.env.NODE_ENV !== "production";
      const qaEnabled = process.env.ENABLE_QA === "true";
      test.skip(!isDev || !qaEnabled, "QA override доступен только в dev с ENABLE_QA=true");

      await page.goto(`${baseURL}/office/dashboard?qa=accountant`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      
      const url = page.url();
      expect(url).toContain("/office");
      await expect(page.getByTestId("office-shell")).toBeVisible({ timeout: 10000 });
    });

    test("GET /office/dashboard?qa=admin -> 200, есть data-testid='office-shell'", async ({ page }) => {
      const isDev = process.env.NODE_ENV !== "production";
      const qaEnabled = process.env.ENABLE_QA === "true";
      test.skip(!isDev || !qaEnabled, "QA override доступен только в dev с ENABLE_QA=true");

      await page.goto(`${baseURL}/office/dashboard?qa=admin`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      
      const url = page.url();
      expect(url).toContain("/office");
      await expect(page.getByTestId("office-shell")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Admin QA маршруты", () => {
    test.use({ storageState: undefined });

    test("GET /admin/qa без auth -> редирект на /staff/login?next=...", async ({ page }) => {
      await page.goto(`${baseURL}/admin/qa`, { waitUntil: "domcontentloaded" });
      // Проверяем редирект на /staff/login или /login с параметром next
      await page.waitForURL((url) => {
        const path = url.pathname;
        return (path === "/staff/login" || path === "/staff-login" || path === "/login") && 
               url.searchParams.has("next");
      }, { timeout: 10000 });
      
      const currentUrl = page.url();
      // Проверяем что URL содержит staff/login, staff-login или /login
      expect(currentUrl).toMatch(/\/(staff[\/-]login|login)/i);
      expect(currentUrl).toContain("next=");
    });

    test("GET /admin/qa?qa=admin -> 200, есть data-testid='qa-root'", async ({ page }) => {
      const isDev = process.env.NODE_ENV !== "production";
      const qaEnabled = process.env.ENABLE_QA === "true";
      test.skip(!isDev || !qaEnabled, "QA override доступен только в dev с ENABLE_QA=true");

      await page.goto(`${baseURL}/admin/qa?qa=admin`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      
      // Проверяем что мы на /admin/qa (не редиректнуло)
      const url = page.url();
      expect(url).toContain("/admin/qa");
      
      // Проверяем наличие qa-root
      await expect(page.getByTestId("qa-root")).toBeVisible({ timeout: 10000 });
    });

    test("GET /forbidden?qa=admin -> кнопка 'В кабинет (QA)' видна и ведет на /cabinet?qa=resident_ok (dev-only)", async ({ page }) => {
      const isDev = process.env.NODE_ENV !== "production";
      const qaEnabled = process.env.ENABLE_QA === "true";
      test.skip(!isDev || !qaEnabled, "QA override доступен только в dev с ENABLE_QA=true");

      // Сначала устанавливаем QA cookie (заход на страницу с ?qa=admin)
      await page.goto(`${baseURL}/?qa=admin`, { waitUntil: "networkidle" });
      
      // Даем время для установки cookie middleware
      await page.waitForTimeout(1000);
      
      // Заходим на /cabinet - middleware должен редиректнуть на /forbidden (admin не имеет доступа к cabinet)
      await page.goto(`${baseURL}/cabinet`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      
      // Проверяем что мы на /forbidden
      const url = page.url();
      expect(url).toContain("/forbidden");
      
      // Проверяем наличие forbidden-root
      await expect(page.getByTestId("forbidden-root")).toBeVisible({ timeout: 10000 });
      
      // Проверяем наличие кнопки "В кабинет (QA)" (должна быть видна для admin в QA режиме)
      await expect(page.getByTestId("forbidden-qa-cabinet")).toBeVisible({ timeout: 10000 });
      
      // Проверяем что ссылка ведет на /cabinet?qa=resident_ok
      const href = await page.getByTestId("forbidden-qa-cabinet").getAttribute("href");
      expect(href).toBe("/cabinet?qa=resident_ok");
    });
  });
});