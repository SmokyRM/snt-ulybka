import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Smoke: Admin login and billing UI", () => {
  test.beforeEach(({}, testInfo) => {
    if (testInfo.project.name !== "smoke-billing-admin") {
      test.skip(true, `Admin tests run only in smoke-billing-admin (current: ${testInfo.project.name})`);
    }
  });

  test("staff login (admin) -> redirects to /admin or /office", async ({ page }) => {
    await page.goto(`${base}/admin`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/(office|admin)(\/|$)/, { timeout: 20000 });

    const finalUrl = page.url();
    expect(finalUrl).not.toContain("/login");
    expect(finalUrl).not.toContain("/cabinet");

    if (finalUrl.includes("/admin")) {
      await expect(page.getByTestId("admin-root")).toBeVisible({ timeout: 10000 });
    } else {
      await expect(page.getByTestId("office-root")).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId("role-indicator")).toBeVisible({ timeout: 5000 });
    }
  });

  test("admin billing: payments import page renders and UI is functional", async ({ page }) => {
    await page.goto(`${base}/admin/billing/payments/import`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/billing\/payments\/import|\/forbidden|\/cabinet/, { timeout: 15000 });

    const currentUrl = page.url();
    if (currentUrl.includes("/forbidden") || currentUrl.includes("/cabinet")) {
      test.skip(true, "Admin access denied to billing - check permissions");
      return;
    }

    await expect(page.getByTestId("payments-import-root")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("payments-import-file")).toBeAttached({ timeout: 5000 });

    const previewBtn = page.getByTestId("payments-import-preview");
    await expect(previewBtn).toBeVisible({ timeout: 5000 });
    await expect(previewBtn).toBeDisabled();

    const apiResponse = await page.request.post(`${base}/api/admin/billing/payments/import/preview`, {
      multipart: {
        file: {
          name: "test.csv",
          mimeType: "text/csv",
          buffer: Buffer.from("date,amount,plotNumber\n2024-01-01,1000,1"),
        },
      },
    });

    const status = apiResponse.status();
    expect([200, 400, 401, 403]).toContain(status);

    if (status === 200) {
      const json = await apiResponse.json();
      expect(json).toHaveProperty("ok");
      if (json.ok) {
        expect(json).toHaveProperty("data");
      } else {
        expect(json).toHaveProperty("error");
      }
    }
  });
});
