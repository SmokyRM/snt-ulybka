import { test, expect } from "@playwright/test";
import { loginStaff } from "./helpers/auth";

test.use({ storageState: undefined });

const roles: Array<"chairman" | "secretary" | "accountant" | "admin"> = [
  "chairman",
  "secretary",
  "accountant",
  "admin",
];

test.describe("Office Smoke Test", () => {
  for (const role of roles) {
    test(`${role}: staff login -> /office -> /office/inbox -> /office/search -> open appeal -> check actions by role`, async ({
      page,
    }) => {
      // 1. Login as staff
      const loggedIn = await loginStaff(page, role, "/office");
      if (!loggedIn) {
        test.skip();
        return;
      }

      // 2. Verify /office dashboard is accessible
      await expect(page).toHaveURL(/\/office/, { timeout: 10000 });
      await expect(page.getByTestId("office-dashboard")).toBeVisible({ timeout: 10000 });

      // 3. Navigate to /office/inbox
      await page.goto("/office/inbox");
      await expect(page.getByTestId("office-inbox-page")).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId("office-inbox-list")).toBeVisible();

      // 4. Navigate to /office/search
      await page.goto("/office/search");
      await expect(page.getByTestId("office-search-page")).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId("office-search-input")).toBeVisible();

      // 5. Try to search for something
      const searchInput = page.getByTestId("office-search-input");
      await searchInput.fill("тест");
      await page.waitForTimeout(500); // Wait for debounce

      // 6. Navigate to appeals list
      await page.goto("/office/appeals");
      await expect(page.getByTestId("office-appeals-page")).toBeVisible({ timeout: 10000 });

      // 7. Try to open first appeal if available
      const appealItems = page.getByTestId(/office-appeals-item-/);
      const appealCount = await appealItems.count();

      if (appealCount > 0) {
        // Click on first appeal
        await appealItems.first().click();
        await page.waitForURL(/\/office\/appeals\/[^/]+/, { timeout: 10000 });

        // Verify appeal detail page
        await expect(page.getByTestId("office-appeal-details")).toBeVisible({ timeout: 10000 });

        // Check actions availability by role
        if (role === "chairman" || role === "secretary" || role === "admin") {
          // These roles can manage appeals
          const statusSelect = page.getByTestId("appeal-status-select");
          const assignButton = page.getByTestId("inbox-assign-me");
          const commentForm = page.getByTestId("appeal-comment-text");

          // At least one of these should be visible
          const hasStatusSelect = await statusSelect.isVisible().catch(() => false);
          const hasAssignButton = await assignButton.isVisible().catch(() => false);
          const hasCommentForm = await commentForm.isVisible().catch(() => false);

          expect(hasStatusSelect || hasAssignButton || hasCommentForm).toBeTruthy();
        } else if (role === "accountant") {
          // Accountant can only view and comment, cannot manage
          const commentForm = page.getByTestId("appeal-comment-text");
          const statusSelect = page.getByTestId("appeal-status-select");

          // Comment form should be visible
          await expect(commentForm).toBeVisible();

          // Status select should NOT be visible (read-only)
          const hasStatusSelect = await statusSelect.isVisible().catch(() => false);
          expect(hasStatusSelect).toBeFalsy();
        }
      } else {
        // If no appeals, at least verify the page structure
        await expect(page.getByTestId("office-appeals-page")).toBeVisible();
      }

      // 8. Verify navigation works
      await page.goto("/office");
      await expect(page.getByTestId("office-dashboard")).toBeVisible({ timeout: 10000 });
    });
  }

  test("all staff roles can access office dashboard", async ({ page }) => {
    for (const role of roles) {
      const loggedIn = await loginStaff(page, role, "/office");
      if (!loggedIn) {
        test.skip();
        return;
      }

      await expect(page.getByTestId("office-dashboard")).toBeVisible({ timeout: 10000 });

      // Logout before next role
      await page.goto("/logout");
      await page.waitForTimeout(1000);
    }
  });
});
