import { test, expect, type Page } from "@playwright/test";
import { loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office appeals search by plot", () => {
  test.use({ storageState: undefined });

  test("chairman can search by plot number", async ({ page }) => {
    await loginStaff(page, "chairman", "/office");
    await page.goto(`${base}/office/appeals?q=12`);
    await expect(page.getByTestId("office-appeals-root")).toBeVisible();
    const itemsLocator = page.locator('[data-testid^="office-appeals-item-"]');
    const emptyLocator = page.getByTestId("office-appeals-empty");
    let hasItems = false;
    let isEmpty = false;
    try {
      await expect(itemsLocator.first()).toBeVisible();
      hasItems = true;
    } catch {
      // ignore
    }
    try {
      await expect(emptyLocator).toBeVisible();
      isEmpty = true;
    } catch {
      // ignore
    }
    if (!hasItems && !isEmpty) {
      throw new Error("Neither items nor empty state found");
    }
  });

  test("accountant is forbidden", async ({ page }) => {
    const ok = await loginStaff(page, "accountant", "/office");
    test.skip(!ok, "No accountant creds in local env");
    await page.goto(`${base}/office/appeals`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
