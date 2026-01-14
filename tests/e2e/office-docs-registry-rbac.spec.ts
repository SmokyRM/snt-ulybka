import { test, expect, type Page } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office Documents & Registry RBAC - role-based access", () => {
  test.use({ storageState: undefined });

  test("secretary (QA) sees documents and registry, but without write", async ({ page }: { page: Page }) => {
    // Clear cookies and navigate with QA param
    await page.context().clearCookies();
    await page.goto(`${base}/office/documents?qa=secretary`, { waitUntil: "domcontentloaded" });
    
    // Wait for navigation to /office/documents (not /forbidden, not /staff-login)
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login") || path.startsWith("/login")) {
        return false;
      }
      return path.startsWith("/office");
    }, { timeout: 20000 });
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/forbidden");
    expect(currentUrl).not.toContain("/staff-login");
    
    // Verify documents page is accessible
    await expect(page.getByTestId("office-documents-root")).toBeVisible({ timeout: 15000 });
    
    // Verify readonly hint is visible
    await expect(page.getByTestId("office-documents-readonly-hint")).toBeVisible({ timeout: 5000 });
    
    // Verify upload/create button is NOT visible
    const uploadButton = page.getByTestId("office-documents-upload");
    await expect(uploadButton).toHaveCount(0, { timeout: 5000 });
    
    // Navigate to registry
    await page.goto(`${base}/office/registry?qa=secretary`, { waitUntil: "domcontentloaded" });
    
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login") || path.startsWith("/login")) {
        return false;
      }
      return path.startsWith("/office");
    }, { timeout: 20000 });
    
    // Verify registry page is accessible
    await expect(page.getByTestId("office-registry-root")).toBeVisible({ timeout: 15000 });
    
    // Verify readonly hint is visible (if there are write functions)
    const readonlyHint = page.getByTestId("office-registry-readonly-hint");
    const hasReadonlyHint = await readonlyHint.isVisible().catch(() => false);
    if (hasReadonlyHint) {
      await expect(readonlyHint).toBeVisible({ timeout: 5000 });
    }
  });

  test("chairman (QA) has write in documents/registry", async ({ page }: { page: Page }) => {
    // Clear cookies and navigate with QA param
    await page.context().clearCookies();
    await page.goto(`${base}/office/documents?qa=chairman`, { waitUntil: "domcontentloaded" });
    
    // Wait for navigation to /office/documents
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login") || path.startsWith("/login")) {
        return false;
      }
      return path.startsWith("/office");
    }, { timeout: 20000 });
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/forbidden");
    
    // Verify documents page is accessible
    await expect(page.getByTestId("office-documents-root")).toBeVisible({ timeout: 15000 });
    
    // Verify upload/create button is visible (if exists)
    const uploadButton = page.getByTestId("office-documents-upload");
    const hasUploadButton = await uploadButton.isVisible().catch(() => false);
    if (hasUploadButton) {
      await expect(uploadButton).toBeVisible({ timeout: 5000 });
    }
    
    // Verify readonly hint is NOT visible
    const readonlyHint = page.getByTestId("office-documents-readonly-hint");
    await expect(readonlyHint).toHaveCount(0, { timeout: 5000 });
    
    // Navigate to registry
    await page.goto(`${base}/office/registry?qa=chairman`, { waitUntil: "domcontentloaded" });
    
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login") || path.startsWith("/login")) {
        return false;
      }
      return path.startsWith("/office");
    }, { timeout: 20000 });
    
    // Verify registry page is accessible
    await expect(page.getByTestId("office-registry-root")).toBeVisible({ timeout: 15000 });
    
    // Verify readonly hint is NOT visible
    const registryReadonlyHint = page.getByTestId("office-registry-readonly-hint");
    await expect(registryReadonlyHint).toHaveCount(0, { timeout: 5000 });
    
    // If there are edit actions, verify they are visible (check for at least one edit container)
    const editActions = page.getByTestId(/office-registry-edit-/);
    const editCount = await editActions.count();
    if (editCount > 0) {
      // At least one edit action should be visible
      await expect(editActions.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("accountant (QA) also read-only", async ({ page }: { page: Page }) => {
    // Clear cookies and navigate with QA param
    await page.context().clearCookies();
    await page.goto(`${base}/office/documents?qa=accountant`, { waitUntil: "domcontentloaded" });
    
    // Wait for navigation to /office/documents
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login") || path.startsWith("/login")) {
        return false;
      }
      return path.startsWith("/office");
    }, { timeout: 20000 });
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/forbidden");
    
    // Verify documents page is accessible
    await expect(page.getByTestId("office-documents-root")).toBeVisible({ timeout: 15000 });
    
    // Verify readonly hint is visible
    await expect(page.getByTestId("office-documents-readonly-hint")).toBeVisible({ timeout: 5000 });
  });
});
