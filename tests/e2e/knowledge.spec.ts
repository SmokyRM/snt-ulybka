import { test, expect, type Page } from "@playwright/test";

test("knowledge list and article do not crash", async ({ page }: { page: Page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  await page.goto(base + "/knowledge");
  await expect(page.getByTestId("knowledge-root")).toBeVisible();
  const firstLink = page.getByRole("link").filter({ hasText: /.+/ }).first();
  await firstLink.click();
  await page.waitForLoadState("networkidle");
  await expect(
    page.locator('[data-testid="knowledge-article-root"], [data-testid="knowledge-article-fallback"]'),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/_error/);
});
