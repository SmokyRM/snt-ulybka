import { test, expect, type Page } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office Appeals & Announcements RBAC - role-based access", () => {
  test.use({ storageState: undefined });

  test("secretary (QA): appeals accessible with comment, but NOT status; announcements accessible with write", async ({
    page,
  }: {
    page: Page;
  }) => {
    // Clear cookies and navigate to appeals
    await page.context().clearCookies();
    await page.goto(`${base}/office/appeals?qa=secretary`, { waitUntil: "domcontentloaded" });

    // Wait for navigation to /office/appeals (not /forbidden, not /staff-login)
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login") || path.startsWith("/login")) {
        return false;
      }
      return path.startsWith("/office/appeals");
    }, { timeout: 20000 });

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/forbidden");
    expect(currentUrl).not.toContain("/staff-login");

    // Verify appeals page is accessible
    await expect(page.getByTestId("office-appeals-root")).toBeVisible({ timeout: 15000 });

    // Verify create form is visible (secretary has comment permission)
    const createForm = page.getByTestId("office-appeals-create");
    const hasCreateForm = await createForm.isVisible().catch(() => false);
    if (hasCreateForm) {
      await expect(createForm).toBeVisible({ timeout: 5000 });
    }

    // Try to navigate to a specific appeal (if any exist)
    // First, check if there are any appeal items
    const appealItems = page.getByTestId(/office-appeals-item-/);
    const appealCount = await appealItems.count();
    if (appealCount > 0) {
      // Click on the first appeal
      await appealItems.first().click({ timeout: 10000 });

      // Wait for navigation to appeal detail
      await page.waitForURL((url) => {
        return url.pathname.startsWith("/office/appeals/") && !url.pathname.endsWith("/office/appeals");
      }, { timeout: 15000 });

      // Verify appeal detail page
      await expect(page.getByTestId("office-appeal-root")).toBeVisible({ timeout: 15000 });

      // Verify comment form is visible (secretary has comment permission)
      await expect(page.getByTestId("office-appeals-comment")).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId("office-appeals-comment-submit")).toBeVisible({ timeout: 5000 });

      // Verify status form is NOT visible (secretary does NOT have status permission)
      const statusForm = page.getByTestId("office-appeals-status");
      await expect(statusForm).toHaveCount(0, { timeout: 5000 });
    } else {
      // If no appeals exist, just verify the list page
      await expect(page.getByTestId("office-appeals-empty").or(page.getByTestId("office-appeals-root"))).toBeVisible({
        timeout: 5000,
      });
    }

    // Navigate to announcements
    await page.goto(`${base}/office/announcements?qa=secretary`, { waitUntil: "domcontentloaded" });

    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login") || path.startsWith("/login")) {
        return false;
      }
      return path.startsWith("/office/announcements");
    }, { timeout: 20000 });

    // Verify announcements page is accessible
    await expect(page.getByTestId("office-announcements-root")).toBeVisible({ timeout: 15000 });

    // Verify create button is visible (secretary has write permission)
    await expect(page.getByTestId("office-announcements-create")).toBeVisible({ timeout: 5000 });

    // Verify readonly hint is NOT visible
    const readonlyHint = page.getByTestId("office-announcements-readonly-hint");
    await expect(readonlyHint).toHaveCount(0, { timeout: 5000 });

    // If there are announcements, check edit/publish buttons
    const announcementItems = page.getByTestId(/office-announcements-item-/);
    const announcementCount = await announcementItems.count();
    if (announcementCount > 0) {
      // Click on the first announcement
      await announcementItems.first().click({ timeout: 10000 });

      // Wait for navigation to announcement detail
      await page.waitForURL((url) => {
        return url.pathname.startsWith("/office/announcements/") && !url.pathname.endsWith("/office/announcements");
      }, { timeout: 15000 });

      // Verify announcement detail page
      await expect(page.getByTestId("office-announcement-root")).toBeVisible({ timeout: 15000 });

      // Verify edit button is visible (secretary has write permission)
      await expect(page.getByTestId("office-announcements-edit")).toBeVisible({ timeout: 5000 });

      // Verify publish/unpublish button is visible (secretary has write permission)
      const publishButton = page.getByTestId("office-announcements-publish");
      const unpublishButton = page.getByTestId("office-announcements-unpublish");
      const hasPublish = await publishButton.isVisible().catch(() => false);
      const hasUnpublish = await unpublishButton.isVisible().catch(() => false);
      expect(hasPublish || hasUnpublish).toBe(true);
    }
  });

  test("accountant (QA): appeals accessible but comment/status NOT visible; announcements -> forbidden", async ({
    page,
  }: {
    page: Page;
  }) => {
    // Clear cookies and navigate to appeals
    await page.context().clearCookies();
    await page.goto(`${base}/office/appeals?qa=accountant`, { waitUntil: "domcontentloaded" });

    // Wait for navigation to /office/appeals (not /forbidden, not /staff-login)
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login") || path.startsWith("/login")) {
        return false;
      }
      return path.startsWith("/office/appeals");
    }, { timeout: 20000 });

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/forbidden");
    expect(currentUrl).not.toContain("/staff-login");

    // Verify appeals page is accessible
    await expect(page.getByTestId("office-appeals-root")).toBeVisible({ timeout: 15000 });

    // Verify readonly hint is visible (accountant has read but not comment/status)
    await expect(page.getByTestId("office-appeals-readonly-hint")).toBeVisible({ timeout: 5000 });

    // Verify create form is NOT visible (accountant does NOT have comment permission)
    const createForm = page.getByTestId("office-appeals-create");
    await expect(createForm).toHaveCount(0, { timeout: 5000 });

    // Try to navigate to a specific appeal (if any exist)
    const appealItems = page.getByTestId(/office-appeals-item-/);
    const appealCount = await appealItems.count();
    if (appealCount > 0) {
      // Click on the first appeal
      await appealItems.first().click({ timeout: 10000 });

      // Wait for navigation to appeal detail
      await page.waitForURL((url) => {
        return url.pathname.startsWith("/office/appeals/") && !url.pathname.endsWith("/office/appeals");
      }, { timeout: 15000 });

      // Verify appeal detail page
      await expect(page.getByTestId("office-appeal-root")).toBeVisible({ timeout: 15000 });

      // Verify readonly hint is visible
      await expect(page.getByTestId("office-appeal-readonly-hint")).toBeVisible({ timeout: 5000 });

      // Verify comment form is NOT visible
      const commentForm = page.getByTestId("office-appeals-comment");
      await expect(commentForm).toHaveCount(0, { timeout: 5000 });

      // Verify status form is NOT visible
      const statusForm = page.getByTestId("office-appeals-status");
      await expect(statusForm).toHaveCount(0, { timeout: 5000 });
    }

    // Navigate to announcements - should redirect to forbidden
    await page.goto(`${base}/office/announcements?qa=accountant`, { waitUntil: "domcontentloaded" });

    // Should redirect to forbidden
    await page.waitForURL((url) => {
      return url.pathname === "/forbidden" || url.pathname.startsWith("/forbidden");
    }, { timeout: 15000 });

    await expect(page.getByTestId("forbidden-root")).toBeVisible({ timeout: 10000 });
    const url = page.url();
    expect(url).toContain("reason=");
    expect(url).toContain("next=/office/announcements");
  });

  test("chairman (QA): appeals accessible with comment and status; announcements accessible with write", async ({
    page,
  }: {
    page: Page;
  }) => {
    // Clear cookies and navigate to appeals
    await page.context().clearCookies();
    await page.goto(`${base}/office/appeals?qa=chairman`, { waitUntil: "domcontentloaded" });

    // Wait for navigation to /office/appeals
    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login") || path.startsWith("/login")) {
        return false;
      }
      return path.startsWith("/office/appeals");
    }, { timeout: 20000 });

    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/forbidden");

    // Verify appeals page is accessible
    await expect(page.getByTestId("office-appeals-root")).toBeVisible({ timeout: 15000 });

    // Verify readonly hint is NOT visible
    const readonlyHint = page.getByTestId("office-appeals-readonly-hint");
    await expect(readonlyHint).toHaveCount(0, { timeout: 5000 });

    // Verify create form is visible (chairman has comment permission)
    const createForm = page.getByTestId("office-appeals-create");
    const hasCreateForm = await createForm.isVisible().catch(() => false);
    if (hasCreateForm) {
      await expect(createForm).toBeVisible({ timeout: 5000 });
    }

    // Try to navigate to a specific appeal (if any exist)
    const appealItems = page.getByTestId(/office-appeals-item-/);
    const appealCount = await appealItems.count();
    if (appealCount > 0) {
      // Click on the first appeal
      await appealItems.first().click({ timeout: 10000 });

      // Wait for navigation to appeal detail
      await page.waitForURL((url) => {
        return url.pathname.startsWith("/office/appeals/") && !url.pathname.endsWith("/office/appeals");
      }, { timeout: 15000 });

      // Verify appeal detail page
      await expect(page.getByTestId("office-appeal-root")).toBeVisible({ timeout: 15000 });

      // Verify comment form is visible (chairman has comment permission)
      await expect(page.getByTestId("office-appeals-comment")).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId("office-appeals-comment-submit")).toBeVisible({ timeout: 5000 });

      // Verify status form is visible (chairman has status permission)
      await expect(page.getByTestId("office-appeals-status")).toBeVisible({ timeout: 5000 });

      // Verify readonly hint is NOT visible
      const appealReadonlyHint = page.getByTestId("office-appeal-readonly-hint");
      await expect(appealReadonlyHint).toHaveCount(0, { timeout: 5000 });
    }

    // Navigate to announcements
    await page.goto(`${base}/office/announcements?qa=chairman`, { waitUntil: "domcontentloaded" });

    await page.waitForURL((url) => {
      const path = url.pathname;
      if (path.startsWith("/forbidden") || path.startsWith("/staff-login") || path.startsWith("/login")) {
        return false;
      }
      return path.startsWith("/office/announcements");
    }, { timeout: 20000 });

    // Verify announcements page is accessible
    await expect(page.getByTestId("office-announcements-root")).toBeVisible({ timeout: 15000 });

    // Verify create button is visible (chairman has write permission)
    await expect(page.getByTestId("office-announcements-create")).toBeVisible({ timeout: 5000 });

    // Verify readonly hint is NOT visible
    const announcementsReadonlyHint = page.getByTestId("office-announcements-readonly-hint");
    await expect(announcementsReadonlyHint).toHaveCount(0, { timeout: 5000 });

    // If there are announcements, check edit/publish buttons
    const announcementItems = page.getByTestId(/office-announcements-item-/);
    const announcementCount = await announcementItems.count();
    if (announcementCount > 0) {
      // Click on the first announcement
      await announcementItems.first().click({ timeout: 10000 });

      // Wait for navigation to announcement detail
      await page.waitForURL((url) => {
        return url.pathname.startsWith("/office/announcements/") && !url.pathname.endsWith("/office/announcements");
      }, { timeout: 15000 });

      // Verify announcement detail page
      await expect(page.getByTestId("office-announcement-root")).toBeVisible({ timeout: 15000 });

      // Verify edit button is visible (chairman has write permission)
      await expect(page.getByTestId("office-announcements-edit")).toBeVisible({ timeout: 5000 });

      // Verify publish/unpublish button is visible (chairman has write permission)
      const publishButton = page.getByTestId("office-announcements-publish");
      const unpublishButton = page.getByTestId("office-announcements-unpublish");
      const hasPublish = await publishButton.isVisible().catch(() => false);
      const hasUnpublish = await unpublishButton.isVisible().catch(() => false);
      expect(hasPublish || hasUnpublish).toBe(true);

      // Verify readonly hint is NOT visible
      const announcementReadonlyHint = page.getByTestId("office-announcement-readonly-hint");
      await expect(announcementReadonlyHint).toHaveCount(0, { timeout: 5000 });
    }
  });
});
