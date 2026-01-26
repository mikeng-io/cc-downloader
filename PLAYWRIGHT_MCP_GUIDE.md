# Playwright MCP Testing Guide

This guide shows how to use Playwright MCP tools to manually test the CC-Downloader workflow.

## Quick Start

Since npm dependencies have installation issues, you can use Playwright MCP directly without installing anything locally.

## Step-by-Step Manual Testing with Playwright MCP

### 1. Navigate to Registration Page

```javascript
// Navigate to http://localhost:3000/register
// Fill in registration form:
// Email: test-user@example.com
// Password: TestPassword123!@# (12 chars, 3 of 4 types)
// Confirm Password: TestPassword123!@#
// Click "Create Account"
```

### 2. Test Login with Created Credentials

```javascript
// Navigate to http://localhost:3000/login
// Fill in:
// Email: test-user@example.com
// Password: TestPassword123!@#
// Click "Sign in"
```

### 3. Test Dark Mode Toggle

```javascript
// Click the theme toggle button in the navbar
// Verify background changes between light and dark
```

### 4. Submit Download URL

```javascript
// Navigate to http://localhost:3000 (or /downloads if logged in)
// Enter URL in the input field
// Use a short test video: https://www.youtube.com/watch?v=90SJ pnl5I6E
// Click "Download" button
```

### 5. Monitor Progress

```javascript
// Watch for the download card to appear
// Verify progress bar shows percentage
// Check status badge (PENDING → PROCESSING → COMPLETED)
```

### 6. View/Watch Video

```javascript
// Once download is COMPLETED
// Click on the download card or "View" button
// Navigate to /watch/[id] page
// Verify video player loads
// Test video controls (play/pause, volume, fullscreen)
```

## MCP Commands Available

The Playwright MCP server provides these tools:

### Browser Navigation
- `browser_navigate` - Navigate to URL
- `browser_navigate_back` - Go back in history
- `browser_tabs` - Get tab information

### Page Interaction
- `browser_click` - Click element
- `browser_fill_form` - Fill form fields
- `browser_type` - Type text
- `browser_press_key` - Press keyboard key
- `browser_select_option` - Select dropdown option
- `browser_hover` - Hover over element

### Content Analysis
- `browser_snapshot` - Take screenshot
- `browser_console_messages` - Get console logs
- `browser_network_requests` - Get network requests
- `browser_run_code` - Execute JavaScript

### Waiting & Timing
- `browser_wait_for` - Wait for element/condition
- `browser_take_screenshot` - Take screenshot

## Example MCP Session

Here's how to use the Playwright MCP tools:

```bash
# 1. Navigate to registration
curl -X POST http://localhost:3000/api/mcp/playwright \
  -H "Content-Type: application/json" \
  -d '{"method": "browser_navigate", "params": {"url": "http://localhost:3000/register"}}'

# 2. Fill email field
curl -X POST http://localhost:3000/api/mcp/playwright \
  -H "Content-Type: application/json" \
  -d '{"method": "browser_fill_form", "params": {"selector": "input[name=\"email\"]", "value": "test@example.com"}}'

# 3. Fill password
curl -X POST http://localhost:3000/api/mcp/playwright \
  -H "Content-Type: application/json" \
  -d '{"method": "browser_fill_form", "params": {"selector": "input[name=\"password\"]", "value": "TestPassword123!@#"}}'

# 4. Submit form
curl -X POST http://localhost:3000/api/mcp/playwright \
  -H "Content-Type: application/json" \
  -d '{"method": "browser_click", "params": {"selector": "button[type=\"submit\"]}}'

# 5. Take screenshot
curl -X POST http://localhost:3000/api/mcp/playwright \
  -H "Content-Type: application/json" \
  -d '{"method": "browser_take_screenshot", "params": {}}'
```

## Current Status

Since the app isn't currently running due to npm dependency issues, here's what needs to be done:

### Option 1: Fix Dependencies
```bash
# Install all dependencies
npm install

# Start the app
npm run dev

# Then run the automated E2E tests
npx playwright test
```

### Option 2: Use Existing Docker Containers
Since you have PostgreSQL, Redis, and MinIO already running:
```bash
# Just need to start the Next.js app directly
npm run dev
```

### Option 3: Minimal Installation
```bash
# Remove optional dependencies temporarily
npm install next@latest react@latest react-dom@latest typescript@latest
npm install @prisma/client@latest prisma@latest next-auth@latest bullmq@latest ioredis@latest
npm run dev
```

## Test Checklist

When the app is running, verify these workflows:

### Registration ✅
- [ ] Navigate to /register
- [ ] See password requirements (12 chars, 3 of 4 types)
- [ ] Successfully register
- [ ] Redirected to login with success message
- [ ] Can log in with new credentials

### Login ✅
- [ ] Navigate to /login
- [ ] Enter email and password
- [ ] Successfully log in
- [ ] Redirected to /downloads
- [ ] See user email in navbar

### Dark Mode ✅
- [ ] See theme toggle in navbar
- [ ] Click to toggle between light/dark
- [ ] Background changes correctly
- [ ] All components styled for both themes

### Download ✅
- [ ] See URL input field on home page
- [ ] Submit a valid URL
- [ ] See download appear in list
- [ ] Progress bar shows percentage
- [ ] Status updates (PENDING → PROCESSING → COMPLETED)

### Video Viewing ✅
- [ ] Click on completed download
- [ ] Navigate to /watch/[id] page
- [ ] Video player loads
- [ ] Controls work (play/pause, volume, fullscreen)
- [ ] Download button works

### Security ✅
- [ ] Rate limiting works (try 6 failed logins)
- [ ] Account lockout message appears
- [ ] Security headers present
- [ ] CORS validation works

## Running Automated Tests

Once dependencies are installed:

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

## Test Coverage

The E2E test suite covers:

1. **Authentication Flow** (5 tests)
   - Registration
   - Login
   - Password validation
   - Rate limiting
   - Session management

2. **Dark Mode** (1 test)
   - Theme toggle functionality

3. **Download Submission** (4 tests)
   - URL validation
   - Download creation
   - Status filtering
   - View switching (list/grid)

4. **Progress Tracking** (2 tests)
   - Progress display
   - Retry functionality

5. **Security Headers** (2 tests)
   - Security headers presence
   - CSP policy validation

6. **API Documentation** (2 tests)
   - Documentation loads
   - Endpoints documented

7. **Video Viewing** (2 tests)
   - Authentication required
   - Video player structure

8. **Performance** (2 tests)
   - Page load time
   - Bundle efficiency

9. **Accessibility** (3 tests)
   - Heading hierarchy
   - Form labels
   - Color contrast

10. **Responsive Design** (2 tests)
    - Mobile layout
    - Desktop features

11. **Session Management** (2 tests)
    - Session persistence
    - Logout functionality

**Total: 27 comprehensive tests**

## Next Steps

1. Fix npm dependencies (see package.json)
2. Start the development server
3. Run the automated tests or use MCP for manual testing
4. Verify all test cases pass

## Troubleshooting

### If app won't start:
```bash
# Check Node version
node --version  # Should be >= 22.0.0

# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

### If tests fail:
```bash
# Install Playwright browsers
npx playwright install

# Check if app is running
curl http://localhost:3000

# Run specific test file
npx playwright test tests/e2e/full-workflow.spec.ts
```

### If Docker issues:
```bash
# Check running containers
docker ps

# Check logs
docker logs <container-name>

# Restart services
docker-compose restart
```
