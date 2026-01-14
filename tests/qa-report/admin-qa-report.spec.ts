import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const outDir = process.env.REPORT_OUT_DIR || "test-results/qa-report-assets";

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

test.describe("QA Report - Admin QA Tools", () => {
  test.use({ storageState: undefined });

  test("generate QA report with screenshots", async ({ page }: { page: Page }) => {
    const steps: Array<{ step: string; status: "pass" | "fail"; screenshot?: string; notes?: string }> = [];

    // Step A: Navigate to /admin/qa
    try {
      await page.goto(`${baseURL}/admin/qa`, { timeout: 60_000, waitUntil: "domcontentloaded" });
      
      // Try to find qa-root testid, but don't fail if it doesn't exist
      const qaRoot = page.getByTestId("qa-root");
      const hasQaRoot = await qaRoot.isVisible().catch(() => false);
      
      if (!hasQaRoot) {
        // Fallback: check URL and look for "QA" heading
        await page.waitForURL((url) => url.pathname.includes("/admin/qa"), { timeout: 10_000 });
        const heading = page.getByRole("heading", { name: /QA/i });
        await expect(heading).toBeVisible({ timeout: 10_000 });
      } else {
        await expect(qaRoot).toBeVisible({ timeout: 10_000 });
      }

      const screenshotPath = path.join(outDir, "admin-qa.png");
      await page.screenshot({ path: screenshotPath, fullPage: true });
      steps.push({ step: "Navigate to /admin/qa", status: "pass", screenshot: "admin-qa.png" });
    } catch (error) {
      steps.push({ step: "Navigate to /admin/qa", status: "fail", notes: String(error) });
      throw error; // Navigation timeout is critical
    }

    // Step B: Navigate to different pages and take screenshots
    const pagesToCheck = [
      { url: "/office", screenshot: "office.png", name: "Office page" },
      { url: "/cabinet", screenshot: "cabinet.png", name: "Cabinet page" },
      { url: "/", screenshot: "home.png", name: "Home page" },
      { url: "/admin", screenshot: "admin.png", name: "Admin page" },
    ];

    for (const { url, screenshot, name } of pagesToCheck) {
      try {
        await page.goto(`${baseURL}${url}`, { timeout: 60_000, waitUntil: "domcontentloaded" });
        const screenshotPath = path.join(outDir, screenshot);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        steps.push({ step: `Navigate to ${name} (${url})`, status: "pass", screenshot });
      } catch (error) {
        steps.push({ step: `Navigate to ${name} (${url})`, status: "fail", notes: String(error) });
        // Continue with other pages even if one fails
      }
    }

    // Step C: Role checks (soft - don't fail if text not found)
    const roleChecks: Array<{ page: string; check: string; found: boolean; text?: string }> = [];

    // Check /office for role indicator
    try {
      await page.goto(`${baseURL}/office`, { timeout: 60_000, waitUntil: "domcontentloaded" });
      const roleText = page.getByText(/Роль:/i);
      const hasRoleText = await roleText.isVisible().catch(() => false);
      if (hasRoleText) {
        const text = await roleText.textContent();
        roleChecks.push({ page: "/office", check: "Роль:", found: true, text: text || undefined });
      } else {
        roleChecks.push({ page: "/office", check: "Роль:", found: false });
      }
    } catch (error) {
      roleChecks.push({ page: "/office", check: "Роль:", found: false });
    }

    // Check /cabinet for "Личный кабинет"
    try {
      await page.goto(`${baseURL}/cabinet`, { timeout: 60_000, waitUntil: "domcontentloaded" });
      const cabinetText = page.getByText(/Личный кабинет/i);
      const hasCabinetText = await cabinetText.isVisible().catch(() => false);
      if (hasCabinetText) {
        const text = await cabinetText.textContent();
        roleChecks.push({ page: "/cabinet", check: "Личный кабинет", found: true, text: text || undefined });
      } else {
        roleChecks.push({ page: "/cabinet", check: "Личный кабинет", found: false });
      }
    } catch (error) {
      roleChecks.push({ page: "/cabinet", check: "Личный кабинет", found: false });
    }

    // Check /admin for "Админ"
    try {
      await page.goto(`${baseURL}/admin`, { timeout: 60_000, waitUntil: "domcontentloaded" });
      const adminText = page.getByText(/Админ/i);
      const hasAdminText = await adminText.isVisible().catch(() => false);
      if (hasAdminText) {
        const text = await adminText.textContent();
        roleChecks.push({ page: "/admin", check: "Админ", found: true, text: text || undefined });
      } else {
        roleChecks.push({ page: "/admin", check: "Админ", found: false });
      }
    } catch (error) {
      roleChecks.push({ page: "/admin", check: "Админ", found: false });
    }

    // Store results in a file for the report generator script to read
    const resultsPath = path.join(outDir, "results.json");
    fs.writeFileSync(
      resultsPath,
      JSON.stringify({ steps, roleChecks }, null, 2),
      "utf-8"
    );
  });
});
