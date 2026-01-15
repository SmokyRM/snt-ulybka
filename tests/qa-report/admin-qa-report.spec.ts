import { test, expect, type Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const outDir = process.env.REPORT_OUT_DIR || "test-results/qa-report-assets";

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Helper: Check if element is visible (soft check, doesn't throw)
async function isElementVisible(page: Page, selector: string, testId?: string): Promise<boolean> {
  try {
    const element = testId ? page.getByTestId(testId) : page.locator(selector);
    return await element.isVisible({ timeout: 5_000 }).catch(() => false);
  } catch {
    return false;
  }
}

// Helper: Navigate and take screenshot (soft, doesn't throw)
async function navigateAndScreenshot(
  page: Page,
  url: string,
  screenshotPath: string,
  timeout: number = 60_000
): Promise<{ ok: boolean; error?: string }> {
  try {
    await page.goto(`${baseURL}${url}`, { timeout, waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

// Helper: Check office page and collect testids
async function checkOfficePage(page: Page, role: string): Promise<{
  ok: boolean;
  testids: {
    "office-root": boolean;
    "office-tile-appeals": boolean;
    "office-tile-announcements": boolean;
    "office-tile-documents": boolean;
    "office-tile-finance": boolean;
  };
  error?: string;
}> {
  try {
    await page.goto(`${baseURL}/office?qa=${role}`, { timeout: 60_000, waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname === "/office" || url.pathname.startsWith("/office/"), {
      timeout: 10_000,
    });

    // Wait a bit for page to render
    await page.waitForLoadState("domcontentloaded");

    const testids = {
      "office-root": await isElementVisible(page, "", "office-root"),
      "office-tile-appeals": await isElementVisible(page, "", "office-tile-appeals"),
      "office-tile-announcements": await isElementVisible(page, "", "office-tile-announcements"),
      "office-tile-documents": await isElementVisible(page, "", "office-tile-documents"),
      "office-tile-finance": await isElementVisible(page, "", "office-tile-finance"),
    };

    return { ok: true, testids };
  } catch (error) {
    return {
      ok: false,
      testids: {
        "office-root": false,
        "office-tile-appeals": false,
        "office-tile-announcements": false,
        "office-tile-documents": false,
        "office-tile-finance": false,
      },
      error: String(error),
    };
  }
}

test.describe("QA Report - Admin QA Tools", () => {
  test.use({ storageState: undefined });

  test("generate QA report with role scenarios", async ({ page }: { page: Page }) => {
    const startedAt = new Date().toISOString();
    const scenarios: Array<{
      role: string;
      pages: {
        office: { url: string; ok: boolean; testids?: Record<string, boolean>; screenshot?: string; error?: string };
        cabinet: { url: string; ok: boolean; screenshot?: string; error?: string };
        home: { url: string; ok: boolean; screenshot?: string; error?: string };
        admin: { url: string; ok: boolean; screenshot?: string; error?: string };
      };
    }> = [];

    // Step 1: Verify /admin/qa is accessible (critical - should throw if fails)
    try {
      await page.goto(`${baseURL}/admin/qa`, { timeout: 60_000, waitUntil: "domcontentloaded" });
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
    } catch (error) {
      throw new Error(`Critical: Cannot access /admin/qa: ${error}`);
    }

    // Step 2: Test each role scenario
    const roles = ["chairman", "accountant", "secretary", "admin"];

    for (const role of roles) {
      const roleDir = path.join(outDir, role);
      if (!fs.existsSync(roleDir)) {
        fs.mkdirSync(roleDir, { recursive: true });
      }

      // 2a: Check /office with QA role
      const officeResult = await checkOfficePage(page, role);
      const officeScreenshot = path.join(roleDir, "office.png");
      if (officeResult.ok) {
        await page.screenshot({ path: officeScreenshot, fullPage: true });
      }

      // 2b: Navigate to other pages and take screenshots
      const cabinetResult = await navigateAndScreenshot(
        page,
        `/cabinet?qa=${role}`,
        path.join(roleDir, "cabinet.png")
      );
      const homeResult = await navigateAndScreenshot(page, `/`, path.join(roleDir, "home.png"));
      const adminResult = await navigateAndScreenshot(page, `/admin?qa=${role}`, path.join(roleDir, "admin.png"));

      scenarios.push({
        role,
        pages: {
          office: {
            url: `/office?qa=${role}`,
            ok: officeResult.ok,
            testids: officeResult.testids,
            screenshot: officeResult.ok ? `${role}/office.png` : undefined,
            error: officeResult.error,
          },
          cabinet: {
            url: `/cabinet?qa=${role}`,
            ok: cabinetResult.ok,
            screenshot: cabinetResult.ok ? `${role}/cabinet.png` : undefined,
            error: cabinetResult.error,
          },
          home: {
            url: `/`,
            ok: homeResult.ok,
            screenshot: homeResult.ok ? `${role}/home.png` : undefined,
            error: homeResult.error,
          },
          admin: {
            url: `/admin?qa=${role}`,
            ok: adminResult.ok,
            screenshot: adminResult.ok ? `${role}/admin.png` : undefined,
            error: adminResult.error,
          },
        },
      });
    }

    // Step 3: Get commit hash (will be set by report generator script)
    const commitHash = process.env.GIT_COMMIT || "unknown";

    // Step 4: Store results
    const results = {
      meta: {
        baseURL,
        commit: commitHash,
        startedAt,
      },
      scenarios,
    };

    const resultsPath = path.join(outDir, "results.json");
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf-8");
  });
});
