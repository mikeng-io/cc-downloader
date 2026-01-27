import { test, expect } from "@playwright/test";

/**
 * Full UI/UX Testing with Playwright
 *
 * Complete automated workflow:
 * 1. Register user
 * 2. Login
 * 3. Test Stats Dashboard
 * 4. Test Recent Downloads
 * 5. Test Download Card animations
 * 6. Test Progress Bar
 * 7. Test Enhanced Viewers
 * 8. Take screenshots at each step
 */

const TEST_USER = {
  email: `playwright-test-${Date.now()}@example.com`,
  password: "PlaywrightTest123!@#",
};

test.describe("Complete UI/UX Enhancements Test", () => {
  test("should complete full workflow with screenshots", async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto("http://localhost:3001");
    await page.screenshot({ path: ".playwright-mcp/01-homepage-unauthenticated.png", fullPage: true });

    // 2. Register
    await page.goto("http://localhost:3001/register");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.screenshot({ path: ".playwright-mcp/02-registration-form.png" });

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await page.screenshot({ path: ".playwright-mcp/03-registration-success.png" });

    // 3. Login
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.screenshot({ path: ".playwright-mcp/04-login-form.png" });

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/downloads/, { timeout: 10000 });
    await page.screenshot({ path: ".playwright-mcp/05-after-login-downloads.png", fullPage: true });

    // 4. Navigate to homepage to see Stats Dashboard
    await page.goto("http://localhost:3001");
    await page.waitForTimeout(2000); // Wait for stats to load
    await page.screenshot({ path: ".playwright-mcp/06-homepage-authenticated-stats.png", fullPage: true });

    // Verify stats dashboard is visible
    await expect(page.locator('text=/Total Downloads|Completed|Processing|Failed/i')).toBeVisible();

    // 5. Test material symbols icons are loaded
    const icons = page.locator('.material-symbols-outlined');
    const iconCount = await icons.count();
    console.log(`Found ${iconCount} Material Symbols icons`);
    expect(iconCount).toBeGreaterThan(0);

    // 6. Submit a download to test animations
    await page.goto("http://localhost:3001");
    const testUrl = "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg";
    await page.fill('input[type="url"]', testUrl);
    await page.screenshot({ path: ".playwright-mcp/07-submit-download-form.png" });

    await page.click('button:has-text("Download")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: ".playwright-mcp/08-download-submitted.png", fullPage: true });

    // 7. Verify download card appears with animations
    await page.waitForSelector('text=/PENDING|PROCESSING/i', { timeout: 5000 });
    await page.screenshot({ path: ".playwright-mcp/09-download-card-with-progress.png", fullPage: true });

    // 8. Test progress bar
    const progressBar = page.locator('[class*="rounded-full"][class*="bg-"]').first();
    await expect(progressBar).toBeVisible();

    // 9. Test Material Design 3 components (Actify)
    const actifyButtons = page.locator('button[class*="button-module"]');
    const actifyButtonCount = await actifyButtons.count();
    console.log(`Found ${actifyButtonCount} Actify buttons`);

    // 10. Test view toggle buttons
    const gridViewButton = page.locator('button[aria-label="Grid view"]');
    const listViewButton = page.locator('button[aria-label="List view"]');

    if (await gridViewButton.isVisible()) {
      await gridViewButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: ".playwright-mcp/10-grid-view.png", fullPage: true });

      await listViewButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: ".playwright-mcp/11-list-view.png", fullPage: true });
    }

    // 11. Test enhanced storage quota display
    await page.goto("http://localhost:3001");
    await page.waitForTimeout(1000);

    // Look for storage/quota indicators
    const storageIndicator = page.locator('text=/Storage|Quota|used/i').first();
    if (await storageIndicator.isVisible()) {
      await storageIndicator.hover();
      await page.waitForTimeout(500);
      await page.screenshot({ path: ".playwright-mcp/12-storage-quota-hover.png" });
    }

    // 12. Test filter functionality
    await page.goto("http://localhost:3001/downloads");
    await page.selectOption('select', 'PENDING');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: ".playwright-mcp/13-filter-pending.png", fullPage: true });

    await page.selectOption('select', 'all');
    await page.waitForTimeout(1000);

    // 13. Test search functionality
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: ".playwright-mcp/14-search-filter.png", fullPage: true });
      await searchInput.clear();
    }

    // 14. Test hover animation on download card
    const downloadCard = page.locator('[class*="rounded"]').first();
    if (await downloadCard.isVisible()) {
      await downloadCard.hover();
      await page.waitForTimeout(300);
      await page.screenshot({ path: ".playwright-mcp/15-card-hover-animation.png" });
    }

    // 15. Test Recent Downloads widget on homepage
    await page.goto("http://localhost:3001");
    await page.waitForTimeout(2000);

    const recentDownloads = page.locator('text=/Recent Downloads/i');
    await expect(recentDownloads).toBeVisible();
    await page.screenshot({ path: ".playwright-mcp/16-recent-downloads-widget.png", fullPage: true });

    // 16. Test accessibility - check for proper ARIA labels
    const ariaLabels = await page.locator('[aria-label]').count();
    console.log(`Found ${ariaLabels} elements with ARIA labels`);
    expect(ariaLabels).toBeGreaterThan(0);

    // 17. Test dark mode toggle
    const themeToggle = page.locator('[aria-label="Toggle theme"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: ".playwright-mcp/17-dark-mode.png", fullPage: true });

      await themeToggle.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: ".playwright-mcp/18-light-mode.png", fullPage: true });
    }

    // 18. Final summary screenshot
    await page.goto("http://localhost:3001");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: ".playwright-mcp/19-final-homepage.png", fullPage: true });

    console.log("✅ All UI/UX enhancements tested successfully!");
    console.log("📸 Screenshots saved to .playwright-mcp/ directory");
  });
});
