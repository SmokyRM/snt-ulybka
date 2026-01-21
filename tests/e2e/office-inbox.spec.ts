import { test, expect } from "@playwright/test";
import { loginStaff } from "./helpers/auth";

test.use({ storageState: undefined });

test("office inbox smoke: staff login -> /office/inbox -> see list -> assign me (if role allows)", async ({ page }) => {
  // Login as secretary (can assign)
  const loggedIn = await loginStaff(page, "secretary", "/office/inbox");
  if (!loggedIn) {
    test.skip();
    return;
  }

  // Should see inbox page
  await expect(page.getByTestId("office-inbox-page")).toBeVisible({ timeout: 10000 });

  // Should see inbox items list
  const inboxList = page.getByTestId("office-inbox-list");
  await expect(inboxList).toBeVisible();

  // Check if there are items
  const items = page.getByTestId("inbox-item");
  const itemCount = await items.count();

  if (itemCount > 0) {
    // Try to find an item without assignee and assign it
    const firstItem = items.first();
    const assignButton = firstItem.getByTestId("inbox-assign-me");
    
    // Check if assign button exists (only for items without assignee)
    const assignButtonVisible = await assignButton.isVisible().catch(() => false);
    
    if (assignButtonVisible) {
      // Click assign button
      await assignButton.click();
      
      // Wait for the button to disappear or become disabled (assignment happened)
      await expect(assignButton).not.toBeVisible({ timeout: 5000 }).catch(() => {
        // If button is still visible, it might be disabled
        return expect(assignButton).toBeDisabled();
      });
    }
  }

  // Verify filters are visible
  await expect(page.getByTestId("inbox-filter-overdue")).toBeVisible();

  // Verify scope toggle works
  const mineLink = page.getByRole("link", { name: "Мои" });
  const allLink = page.getByRole("link", { name: "Все" });
  await expect(mineLink).toBeVisible();
  await expect(allLink).toBeVisible();
});

test("office inbox: accountant can view but cannot assign", async ({ page }) => {
  // Login as accountant (cannot assign)
  const loggedIn = await loginStaff(page, "accountant", "/office/inbox");
  if (!loggedIn) {
    test.skip();
    return;
  }

  // Should see inbox page
  await expect(page.getByTestId("office-inbox-page")).toBeVisible({ timeout: 10000 });

  // Should see inbox items list
  const inboxList = page.getByTestId("office-inbox-list");
  await expect(inboxList).toBeVisible();

  // Check if there are items
  const items = page.getByTestId("inbox-item");
  const itemCount = await items.count();

  if (itemCount > 0) {
    // Accountant should NOT see assign buttons
    const assignButtons = page.getByTestId("inbox-assign-me");
    await expect(assignButtons).toHaveCount(0);
  }
});

test("office inbox requires staff auth", async ({ page }) => {
  await page.goto("/office/inbox");
  await expect(page.getByTestId("staff-login-root")).toBeVisible();
});
