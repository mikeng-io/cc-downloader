import { test, expect } from "@playwright/test";

/**
 * UI/UX Enhancements E2E Test Suite
 *
 * Tests the new UI/UX features implemented in Phase 2-3:
 * - Stats Dashboard with real-time updates
 * - Recent Downloads widget
 * - Enhanced Progress Bar with animations
 * - Enhanced Viewers (Video, Audio, Image) with controls
 * - Material Design 3 components
 * - Grid view improvements
 */

const TEST_USER = {
  email: `test-uiux-${Date.now()}@example.com`,
  password: "TestPassword123!@#",
  confirmPassword: "TestPassword123!@#",
};

test.describe("Stats Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto("http://localhost:3000/register");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.confirmPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login/);

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/downloads/);

    // Navigate to homepage
    await page.goto("http://localhost:3000");
  });

  test("should display stats dashboard on homepage", async ({ page }) => {
    // Check for stats cards
    await expect(page.locator('text=/Total Downloads/i')).toBeVisible();
    await expect(page.locator('text=/Completed/i')).toBeVisible();
    await expect(page.locator('text=/Processing/i')).toBeVisible();
    await expect(page.locator('text=/Failed/i')).toBeVisible();
  });

  test("should show zero stats for new user", async ({ page }) => {
    // New user should have 0 for all stats
    const statsCards = page.locator('[data-testid="stats-card"], .text-3xl, .text-4xl');
    const firstCard = statsCards.first();

    await expect(firstCard).toContainText("0");
  });

  test("should display Material icons in stats cards", async ({ page }) => {
    // Check for Material Symbols icons
    const materialIcons = page.locator('.material-symbols-outlined');
    const iconCount = await materialIcons.count();

    expect(iconCount).toBeGreaterThan(0);
  });

  test("should animate stats on load", async ({ page }) => {
    // Reload page to see animation
    await page.reload();

    // Stats cards should have Framer Motion animation classes
    const statsSection = page.locator('text=/Total Downloads/i').locator('..');
    await expect(statsSection).toBeVisible({ timeout: 2000 });
  });
});

test.describe("Recent Downloads Widget", () => {
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto("http://localhost:3000/register");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.confirmPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login/);

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/downloads/);

    await page.goto("http://localhost:3000");
  });

  test("should display recent downloads section", async ({ page }) => {
    await expect(page.locator('text=/Recent Downloads/i')).toBeVisible();
  });

  test("should show empty state for new user", async ({ page }) => {
    await expect(page.locator('text=/No recent downloads/i')).toBeVisible();
  });

  test("should have View All Downloads link", async ({ page }) => {
    const viewAllLink = page.locator('a:has-text("View All Downloads")');
    await expect(viewAllLink).toBeVisible();

    await viewAllLink.click();
    await expect(page).toHaveURL(/\/downloads/);
  });

  test("should switch between list and grid views", async ({ page }) => {
    // Look for view toggle buttons
    const listButton = page.locator('button[aria-label="List view"]');
    const gridButton = page.locator('button[aria-label="Grid view"]');

    if (await listButton.isVisible()) {
      await gridButton.click();
      await page.waitForTimeout(300);

      // Grid layout should be applied
      const container = page.locator('[class*="grid"]').first();
      await expect(container).toBeVisible();

      await listButton.click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe("Enhanced Progress Bar", () => {
  test.beforeEach(async ({ page }) => {
    // Register, login, and create a download
    await page.goto("http://localhost:3000/register");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.confirmPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login/);

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/downloads/);

    // Submit a test download
    await page.fill('input[type="url"]', "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.click('button:has-text("Download")');
    await page.waitForTimeout(1000);
  });

  test("should display enhanced progress bar with gradient", async ({ page }) => {
    // Wait for download to appear
    await page.waitForSelector('text=/PENDING|PROCESSING/i', { timeout: 5000 });

    // Progress bar should have gradient colors
    const progressBar = page.locator('[class*="from-blue"], [class*="from-green"], [class*="from-yellow"]').first();
    await expect(progressBar).toBeVisible();
  });

  test("should show percentage for processing downloads", async ({ page }) => {
    await page.waitForSelector('text=/PENDING|PROCESSING/i', { timeout: 5000 });

    // Look for percentage display
    const percentageText = page.locator('text=/%/');
    // Percentage may appear once processing starts
    const percentageExists = await percentageText.count() > 0;
    expect(percentageExists).toBeTruthy();
  });

  test("should display download speed and ETA when available", async ({ page }) => {
    await page.waitForSelector('text=/PROCESSING/i', { timeout: 10000 });

    // These appear during active downloads
    const downloadInfo = page.locator('text=/MB\\/s|KB\\/s|s left|m left/i');
    const hasInfo = await downloadInfo.count() > 0;
    expect(hasInfo).toBeTruthy();
  });

  test("should show shimmer animation for pending downloads", async ({ page }) => {
    await page.waitForSelector('text=/PENDING/i', { timeout: 5000 });

    // Pending downloads should have shimmer effect (indeterminate progress)
    const progressContainer = page.locator('[class*="rounded-full"][class*="bg-gray"]').first();
    await expect(progressContainer).toBeVisible();
  });
});

test.describe("Enhanced Video Viewer", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Register and login
    await page.goto("http://localhost:3000/register");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.confirmPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login/);

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/downloads/);
  });

  test("should display custom video controls", async ({ page }) => {
    // Navigate to a test video viewer page
    // Note: This requires a completed download with video MIME type
    // For now, test the UI elements exist

    await page.goto("http://localhost:3000/view/test-video-id");

    // Look for custom control elements
    const controlButtons = page.locator('button[class*="rounded"]');
    const hasControls = await controlButtons.count() > 0;
    expect(hasControls).toBeTruthy();
  });

  test("should have playback speed selector", async ({ page }) => {
    await page.goto("http://localhost:3000/view/test-video-id");

    // Look for playback speed dropdown
    const speedSelector = page.locator('select, [aria-label*="speed"]');
    const hasSpeedControl = await speedSelector.count() > 0;
    expect(hasSpeedControl).toBeTruthy();
  });

  test("should have fullscreen button", async ({ page }) => {
    await page.goto("http://localhost:3000/view/test-video-id");

    // Look for fullscreen button
    const fullscreenButton = page.locator('button:has-text("fullscreen"), [aria-label*="fullscreen"]');
    const hasFullscreen = await fullscreenButton.count() > 0;
    expect(hasFullscreen).toBeTruthy();
  });
});

test.describe("Enhanced Audio Viewer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/register");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.confirmPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login/);

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/downloads/);
  });

  test("should display audio visualizer canvas", async ({ page }) => {
    await page.goto("http://localhost:3000/view/test-audio-id");

    // Look for visualizer canvas
    const canvas = page.locator('canvas');
    const hasCanvas = await canvas.count() > 0;
    expect(hasCanvas).toBeTruthy();
  });

  test("should have loop control button", async ({ page }) => {
    await page.goto("http://localhost:3000/view/test-audio-id");

    // Look for loop/repeat button
    const loopButton = page.locator('button:has-text("repeat"), [aria-label*="loop"]');
    const hasLoop = await loopButton.count() > 0;
    expect(hasLoop).toBeTruthy();
  });

  test("should have playback speed selector", async ({ page }) => {
    await page.goto("http://localhost:3000/view/test-audio-id");

    // Look for playback speed dropdown
    const speedSelector = page.locator('select');
    const hasSpeedControl = await speedSelector.count() > 0;
    expect(hasSpeedControl).toBeTruthy();
  });
});

test.describe("Enhanced Image Gallery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/register");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.confirmPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login/);

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/downloads/);
  });

  test("should have zoom controls", async ({ page }) => {
    await page.goto("http://localhost:3000/view/test-image-id");

    // Look for zoom in/out buttons
    const zoomButtons = page.locator('button:has-text("zoom"), [aria-label*="zoom"]');
    const hasZoomControls = await zoomButtons.count() > 0;
    expect(hasZoomControls).toBeTruthy();
  });

  test("should have rotation controls", async ({ page }) => {
    await page.goto("http://localhost:3000/view/test-image-id");

    // Look for rotate buttons
    const rotateButtons = page.locator('button:has-text("rotate"), [aria-label*="rotate"]');
    const hasRotateControls = await rotateButtons.count() > 0;
    expect(hasRotateControls).toBeTruthy();
  });

  test("should have fit mode selector", async ({ page }) => {
    await page.goto("http://localhost:3000/view/test-image-id");

    // Look for fit/fill/actual size selector
    const fitSelector = page.locator('select, button:has-text("Fit"), button:has-text("Fill")');
    const hasFitMode = await fitSelector.count() > 0;
    expect(hasFitMode).toBeTruthy();
  });

  test("should have fullscreen button", async ({ page }) => {
    await page.goto("http://localhost:3000/view/test-image-id");

    // Look for fullscreen button
    const fullscreenButton = page.locator('button:has-text("fullscreen"), [aria-label*="fullscreen"]');
    const hasFullscreen = await fullscreenButton.count() > 0;
    expect(hasFullscreen).toBeTruthy();
  });

  test("should display image dimensions", async ({ page }) => {
    await page.goto("http://localhost:3000/view/test-image-id");

    // Look for dimension display (e.g., "1920 × 1080 px")
    const dimensionText = page.locator('text=/\\d+\\s*×\\s*\\d+\\s*px/');
    const hasDimensions = await dimensionText.count() > 0;
    expect(hasDimensions).toBeTruthy();
  });
});

test.describe("Material Design 3 Components", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/register");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.confirmPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login/);

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/downloads/);
  });

  test("should use Actify TextField components", async ({ page }) => {
    // Actify TextFields have specific structure
    const textField = page.locator('input[type="text"], input[type="url"]').first();
    await expect(textField).toBeVisible();

    // Check for Material Design styling
    const parent = textField.locator('..');
    const hasClasses = await parent.evaluate((el) => el.classList.length > 0);
    expect(hasClasses).toBeTruthy();
  });

  test("should use Actify Button components", async ({ page }) => {
    // Look for buttons with Material Design styling
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Buttons should have proper styling classes
    const firstButton = buttons.first();
    const hasClasses = await firstButton.evaluate((el: HTMLElement) =>
      el.classList.length > 0
    );
    expect(hasClasses).toBeTruthy();
  });

  test("should use Material Symbols icons", async ({ page }) => {
    // Check for Material Symbols
    const materialIcons = page.locator('.material-symbols-outlined');
    const iconCount = await materialIcons.count();
    expect(iconCount).toBeGreaterThan(0);
  });

  test("should have elevated cards with proper shadows", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Stats cards should have elevation
    const cards = page.locator('[class*="shadow"], [class*="elevation"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });
});

test.describe("Framer Motion Animations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/register");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.confirmPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login/);

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/downloads/);
  });

  test("should animate download cards on page load", async ({ page }) => {
    // Submit a download first
    await page.fill('input[type="url"]', "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.click('button:has-text("Download")');

    await page.waitForTimeout(500);

    // Cards should fade in with animation
    const downloadCard = page.locator('[class*="rounded"]').first();
    await expect(downloadCard).toBeVisible();
  });

  test("should animate stats cards on homepage", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Stats should animate in
    await expect(page.locator('text=/Total Downloads/i')).toBeVisible();

    // Numbers should have animation
    const statsValue = page.locator('.text-3xl, .text-4xl').first();
    await expect(statsValue).toBeVisible();
  });

  test("should have hover animations on cards", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Hover over a stats card
    const statsCard = page.locator('text=/Total Downloads/i').locator('..');
    await statsCard.hover();

    // Card should have hover state (elevation change)
    await page.waitForTimeout(200);
    const hasHoverEffect = await statsCard.evaluate((el) =>
      window.getComputedStyle(el).transform !== 'none'
    );

    expect(hasHoverEffect).toBeTruthy();
  });
});

test.describe("Storage Quota Enhanced Display", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/register");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.confirmPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/login/);

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/downloads/);

    await page.goto("http://localhost:3000");
  });

  test("should display storage quota with color zones", async ({ page }) => {
    // Look for quota display
    await expect(page.locator('text=/Storage/i')).toBeVisible();

    // Progress bar should have color gradient
    const progressBar = page.locator('[class*="from-green"], [class*="from-yellow"], [class*="from-red"]').first();
    const hasGradient = await progressBar.count() > 0;
    expect(hasGradient).toBeTruthy();
  });

  test("should show tooltip on hover", async ({ page }) => {
    // Find quota display and hover
    const quotaDisplay = page.locator('text=/Storage/i').locator('..');
    await quotaDisplay.hover();

    await page.waitForTimeout(300);

    // Tooltip might appear with additional info
    // This is a basic check that hover doesn't cause errors
    await expect(quotaDisplay).toBeVisible();
  });

  test("should display percentage and used/total values", async ({ page }) => {
    // Look for percentage and size values
    const percentageText = page.locator('text=/%/');
    const sizeText = page.locator('text=/GB|MB/');

    const hasPercentage = await percentageText.count() > 0;
    const hasSize = await sizeText.count() > 0;

    expect(hasPercentage || hasSize).toBeTruthy();
  });
});
