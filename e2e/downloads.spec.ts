import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/downloads");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should login with valid credentials", async ({ page }) => {
    await page.click("text=Sign in");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "admin");
    await page.click('button[type="submit"]');

    // Should redirect to home page after login
    await expect(page).toHaveURL("/");
    await expect(page.locator("text=CC-Downloader")).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.click("text=Sign in");
    await page.fill('input[name="email"]', "wrong@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator("text=Invalid credentials")).toBeVisible();
  });
});

test.describe("URL Submission Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "admin");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");
  });

  test("should submit a valid URL", async ({ page }) => {
    const testUrl = "https://example.com/video.mp4";

    await page.fill('input[type="url"]', testUrl);
    await page.click('button:has-text("Download")');

    // Should show success state
    await expect(page.locator(`text=${testUrl}`)).not.toBeVisible();
    // URL input should be cleared
    await expect(page.locator('input[type="url"]')).toHaveValue("");
  });

  test("should reject empty URL", async ({ page }) => {
    await page.click('button:has-text("Download")');

    // Should show validation error
    await expect(page.locator("text=Please enter a URL")).toBeVisible();
  });

  test("should reject invalid URL format", async ({ page }) => {
    await page.fill('input[type="url"]', "not-a-valid-url");
    await page.click('button:has-text("Download")');

    // Should show validation error
    await expect(page.locator("text=Invalid URL format")).toBeVisible();
  });

  test("should reject private IP addresses", async ({ page }) => {
    await page.fill('input[type="url"]', "http://127.0.0.1/file.mp4");
    await page.click('button:has-text("Download")');

    // Should show security error
    await expect(page.locator("text=Private IP addresses are not allowed")).toBeVisible();
  });
});

test.describe("Download Management Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "admin");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");
  });

  test("should display download list", async ({ page }) => {
    await page.goto("/downloads");

    // Should show downloads page
    await expect(page.locator("h1:has-text('Downloads')")).toBeVisible();
  });

  test("should retry failed download", async ({ page }) => {
    // This test assumes there's a failed download in the list
    await page.goto("/downloads");

    // Click retry button on first failed download
    const retryButton = page.locator("button:has-text('Retry')").first();
    if (await retryButton.isVisible()) {
      await retryButton.click();
      // Should show retrying state
      await expect(page.locator("text=Retrying...")).toBeVisible();
    }
  });

  test("should delete download with confirmation", async ({ page }) => {
    await page.goto("/downloads");

    // Click delete button
    await page.locator("button:has-text('Delete')").first().click();

    // Should show confirmation dialog
    await expect(page.locator("text=Are you sure")).toBeVisible();

    // Confirm deletion
    await page.click("button:has-text('Delete')", { hasText: "Are you sure" });

    // Confirmation dialog should be gone
    await expect(page.locator("text=Are you sure")).not.toBeVisible();
  });
});

test.describe("Progress Tracking Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "admin");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");
  });

  test("should show progress for active downloads", async ({ page }) => {
    // Submit a URL
    await page.fill('input[type="url"]', "https://example.com/video.mp4");
    await page.click('button:has-text("Download")');

    // Should show progress indicator
    await expect(page.locator("text=PENDING").or(page.locator("text=PROCESSING"))).toBeVisible();
  });

  test("should show completed status", async ({ page }) => {
    await page.goto("/downloads");

    // Find completed download card
    const completedCard = page.locator("text=COMPLETED").first();
    if (await completedCard.isVisible()) {
      // Should show download button
      await expect(page.locator("button:has-text('Download')")).toBeVisible();
    }
  });
});

test.describe("Responsive Design", () => {
  test("should work on mobile devices", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/");

    // Mobile menu should be present
    await expect(page.locator("nav")).toBeVisible();

    // Submit form should be responsive
    const form = page.locator("form");
    await expect(form).toBeVisible();
  });
});
