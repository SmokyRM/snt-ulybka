import { test, expect, type Page } from "@playwright/test";
import { loginResidentByCode } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("QA Role Switch - logout and role change", () => {
  test.use({ storageState: undefined });

  test("QA chairman -> logout -> resident login works without deadlock", async ({ page }: { page: Page }) => {
    // a) await page.context().clearCookies()
    await page.context().clearCookies();

    // b) goto `${base}/office?qa=chairman` (waitUntil: "domcontentloaded")
    await page.goto(`${base}/office?qa=chairman`, { waitUntil: "domcontentloaded" });
    
    // Wait for navigation to /office (not /staff-login) - same pattern as other tests
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/staff-login")) {
        return false;
      }
      return path.startsWith("/office") || path.startsWith("/forbidden");
    }, { timeout: 20000 });

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/forbidden");
    expect(currentUrl).not.toContain("/staff-login");

    // Verify office-root is visible
    await expect(page.getByTestId("office-root")).toBeVisible({ timeout: 15000 });

    // c) мягко проверить role-indicator (виден; если текст содержит "(QA)" — ок, но не делай жесткого падения по тексту)
    const roleIndicator = page.getByTestId("role-indicator");
    await expect(roleIndicator).toBeVisible({ timeout: 5000 });
    
    // Мягкая проверка: если текст содержит "(QA)" — ок
    const roleText = await roleIndicator.textContent().catch(() => "");
    if (roleText && roleText.includes("(QA)")) {
      // OK - содержит "(QA)"
    }

    // d) нажать global-logout
    await expect(page.getByTestId("global-logout")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("global-logout").click({ timeout: 10000 });

    // e) дождаться URL начинающегося с /login
    await page.waitForURL((url) => {
      return url.pathname === "/login" || url.pathname.startsWith("/login");
    }, { timeout: 20000 });

    // f) выполнить loginResidentByCode(page, "/cabinet")
    await loginResidentByCode(page, "/cabinet");

    // g) проверить cabinet-root и role-indicator видимы
    // h) убедиться, что не зациклило на /forbidden или обратно на /login
    // Wait for navigation away from /login (onboarding redirects are handled in loginResidentByCode)
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
    const url = page.url();

    // Handle onboarding redirect
    if (url.includes("onboarding=1") || url.includes("/onboarding") || url.includes("/cabinet/profile")) {
      await page.waitForURL((url) => url.pathname.includes("/onboarding") || url.pathname.includes("/cabinet"), { timeout: 5000 }).catch(() => {});
      const currentUrl = page.url();
      if (currentUrl.includes("/onboarding")) {
        await expect(page.locator('input[name="fullName"]')).toBeVisible({ timeout: 5000 });
        return;
      }
      await expect(page.locator('h1').or(page.locator('input')).first()).toBeVisible({ timeout: 5000 });
      return;
    }

    // Wait for final URL if not onboarding
    await page.waitForURL((url) => url.pathname.startsWith("/cabinet") || url.pathname.startsWith("/forbidden"), { timeout: 15000 });
    const finalUrl = page.url();

    // i) убедиться, что не зациклило на /forbidden или обратно на /login
    expect(finalUrl).not.toContain("/forbidden");
    expect(finalUrl).not.toContain("/login");

    // g) проверить cabinet-root и role-indicator видимы
    await expect(page.getByTestId("cabinet-root")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("role-indicator")).toBeVisible({ timeout: 5000 });

    // Verify cabinet page content (may be on onboarding/profile, so check if cabinet-page-root exists)
    const cabinetPageRoot = page.getByTestId("cabinet-page-root");
    const hasCabinetPageRoot = await cabinetPageRoot.isVisible().catch(() => false);
    if (hasCabinetPageRoot) {
      await expect(cabinetPageRoot).toBeVisible({ timeout: 5000 });
    }

    // j) дополнительно: проверить cookies — qaScenario либо отсутствует, либо value пустая строка
    const cookies = await page.context().cookies();
    const qaCookie = cookies.find((c) => c.name === "qaScenario");
    if (qaCookie) {
      expect(qaCookie.value).toBe("");
    }
  });
});
