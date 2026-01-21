import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("E2E Regression - Admin Flow", () => {
  test.use({ storageState: undefined });

  test("admin flow: /admin -> plots -> billing -> debtors", async ({ page }) => {
    // 1. Логинимся как admin
    await page.goto(`${baseURL}/staff/login`, { waitUntil: "domcontentloaded" });
    const adminCode = process.env.TEST_ADMIN_CODE || "1233";
    await page.fill('input[name="code"]', adminCode);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname === "/admin", { timeout: 10000 });
    
    // Проверяем что мы на админке
    await expect(page.getByTestId("admin-shell")).toBeVisible();
    await expect(page.getByTestId("admin-quick-actions")).toBeVisible();

    // 2. Переходим на реестр через quick actions (теперь вкладки)
    await page.getByTestId("admin-quick-actions").getByRole("link", { name: /реестр/i }).click();
    await page.waitForURL((url) => url.pathname === "/admin/registry", { timeout: 10000 });
    
    // Проверяем что мы на странице реестра (вкладка участки)
    await page.waitForURL((url) => url.pathname === "/admin/registry" && (url.searchParams.get("tab") === "plots" || !url.searchParams.get("tab")), { timeout: 10000 });
    await expect(page.locator("button").filter({ hasText: /участки|владельцы/i })).toBeVisible();

    // 3. Переходим на биллинг (через меню или прямой переход)
    await page.goto(`${baseURL}/admin/billing`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    
    // Проверяем что мы на странице биллинга
    await expect(page.getByTestId("admin-billing-page")).toBeVisible();

    // 4. Переходим на должников
    await page.goto(`${baseURL}/admin/notifications/debtors`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    
    // Проверяем что мы на странице должников
    await expect(page.getByTestId("admin-debtors-page")).toBeVisible();
  });
});
