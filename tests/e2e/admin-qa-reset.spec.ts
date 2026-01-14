import { test, expect, type Page } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const adminCode = process.env.TEST_ADMIN_CODE || "1233";

test.describe("QA reset functionality", () => {
  test.use({ storageState: undefined });

  test("QA reset clears scenario and banners", async ({ page }: { page: Page }) => {
    // Login as admin
    await page.goto(`${base}/login?next=/admin/qa`);
    await page.getByTestId("login-access-code").fill(adminCode);
    await page.getByTestId("login-submit").click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Navigate to QA page
    await page.goto(`${base}/admin/qa`, { waitUntil: "domcontentloaded" });
    
    // Set QA override via query param (chairman) - middleware will set cookie
    await page.goto(`${base}/admin/qa?qa=chairman`, { waitUntil: "domcontentloaded" });
    // Wait for URL to be /admin/qa (middleware may redirect)
    await page.waitForURL((url) => url.pathname === "/admin/qa", { timeout: 10000 });
    
    // Verify QA cookie is set
    const cookiesBefore = await page.context().cookies();
    const qaCookieBefore = cookiesBefore.find((c) => c.name === "qaScenario");
    expect(qaCookieBefore?.value).toBe("chairman");
    
    // Reload page to see banners
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname === "/admin/qa", { timeout: 10000 });
    
    // Wait for QA banner or floating indicator to appear
    await expect(
      page.getByTestId("qa-banner").or(page.getByTestId("qa-floating-indicator"))
    ).toBeVisible({ timeout: 5000 });
    
    // Click reset button on QA page
    const resetButton = page.getByTestId("qa-reset-admin");
    await expect(resetButton).toBeVisible();
    await resetButton.click();
    
    // Wait for redirect to clean /admin/qa URL (without query params)
    await page.waitForURL((url) => url.pathname === "/admin/qa" && !url.searchParams.has("qa"), { timeout: 20000 });
    
    // Wait for QA banners to disappear (use toHaveCount for reliability)
    await expect(page.getByTestId("qa-banner")).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByTestId("qa-floating-indicator")).toHaveCount(0, { timeout: 5000 });
    
    // Verify QA cookie is cleared
    const cookiesAfter = await page.context().cookies();
    const qaCookieAfter = cookiesAfter.find((c) => c.name === "qaScenario");
    // Cookie should be deleted (not present) or have empty/expired value
    if (qaCookieAfter) {
      expect(qaCookieAfter.value).toBe("");
    }
    
    // Verify QA banner is gone
    const bannerAfterReset = await page.getByTestId("qa-banner").isVisible().catch(() => false);
    const floatingAfterReset = await page.getByTestId("qa-floating-indicator").isVisible().catch(() => false);
    
    expect(bannerAfterReset).toBe(false);
    expect(floatingAfterReset).toBe(false);
    
    // Verify scenario text shows "не задан"
    const pageText = await page.textContent("body");
    expect(pageText).toContain("не задан");
    
    // Verify no QA banner appears on /admin after reset
    await page.goto(`${base}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname.startsWith("/admin"), { timeout: 5000 });
    const bannerOnAdmin = await page.getByTestId("qa-banner").isVisible().catch(() => false);
    const floatingOnAdmin = await page.getByTestId("qa-floating-indicator").isVisible().catch(() => false);
    expect(bannerOnAdmin).toBe(false);
    expect(floatingOnAdmin).toBe(false);
    
    // Verify no QA banner appears on /office after reset (if accessible)
    await page.goto(`${base}/office`, { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname.startsWith("/office") || url.pathname.startsWith("/forbidden") || url.pathname.startsWith("/staff-login"), { timeout: 10000 });
    const currentUrl = page.url();
    if (currentUrl.includes("/office")) {
      const bannerOnOffice = await page.getByTestId("qa-banner").isVisible().catch(() => false);
      const floatingOnOffice = await page.getByTestId("qa-floating-indicator").isVisible().catch(() => false);
      expect(bannerOnOffice).toBe(false);
      expect(floatingOnOffice).toBe(false);
    }
  });

  test("QA reset via API endpoint clears cookies", async ({ page }: { page: Page }) => {
    // Login as admin
    await page.goto(`${base}/login?next=/admin/qa`);
    await page.getByTestId("login-access-code").fill(adminCode);
    await page.getByTestId("login-submit").click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    
    // Set QA override via query param - middleware will set cookie
    await page.goto(`${base}/admin/qa?qa=chairman`, { waitUntil: "domcontentloaded" });
    // Wait for URL to be /admin/qa (middleware may redirect)
    await page.waitForURL((url) => url.pathname === "/admin/qa", { timeout: 10000 });
    
    // Verify QA cookie is set
    const cookies = await page.context().cookies();
    const qaCookie = cookies.find((c) => c.name === "qaScenario");
    expect(qaCookie).toBeDefined();
    expect(qaCookie?.value).toBe("chairman");
    
    // Call reset endpoint
    const response = await page.request.post(`${base}/api/admin/qa/reset`);
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data.ok).toBe(true);
    
    // Wait for QA banners to disappear after reset
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname === "/admin/qa", { timeout: 10000 });
    // Wait for QA banners to disappear (use toHaveCount for reliability)
    await expect(page.getByTestId("qa-banner")).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByTestId("qa-floating-indicator")).toHaveCount(0, { timeout: 5000 });
    
    // Verify QA cookie is cleared
    const cookiesAfterReset = await page.context().cookies();
    const qaCookieAfterReset = cookiesAfterReset.find((c) => c.name === "qaScenario");
    // Cookie should be deleted (not present) or have empty value
    if (qaCookieAfterReset) {
      expect(qaCookieAfterReset.value).toBe("");
    }
    
    // Reload page to verify banners are gone
    await page.reload({ waitUntil: "domcontentloaded" });
    
    // Verify no QA banner
    const bannerAfterReset = await page.getByTestId("qa-banner").isVisible().catch(() => false);
    expect(bannerAfterReset).toBe(false);
    
    // Verify no QA banner appears on /admin after reset
    await page.goto(`${base}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname.startsWith("/admin"), { timeout: 5000 });
    const bannerOnAdmin = await page.getByTestId("qa-banner").isVisible().catch(() => false);
    const floatingOnAdmin = await page.getByTestId("qa-floating-indicator").isVisible().catch(() => false);
    expect(bannerOnAdmin).toBe(false);
    expect(floatingOnAdmin).toBe(false);
    
    // Verify no QA banner appears on /office after reset (if accessible)
    await page.goto(`${base}/office`, { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname.startsWith("/office") || url.pathname.startsWith("/forbidden") || url.pathname.startsWith("/staff-login"), { timeout: 10000 });
    const currentUrl = page.url();
    if (currentUrl.includes("/office")) {
      const bannerOnOffice = await page.getByTestId("qa-banner").isVisible().catch(() => false);
      const floatingOnOffice = await page.getByTestId("qa-floating-indicator").isVisible().catch(() => false);
      expect(bannerOnOffice).toBe(false);
      expect(floatingOnOffice).toBe(false);
    }
  });
});
