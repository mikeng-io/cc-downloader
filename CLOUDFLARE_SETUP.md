# Cloudflare Configuration Guide

## Cache Configuration

### 1. Cache Rules (Recommended)

Create these Cache Rules in Cloudflare Dashboard → Caching → Cache Rules:

#### Rule 1: Cache Static Assets
- **When incoming requests match**: Custom filter expression
  ```
  (http.request.uri.path starts_with "/_next/static/") or
  (http.request.uri.path starts_with "/images/")
  ```
- **Then**:
  - Cache eligibility: Eligible for cache
  - Edge TTL: 1 year
  - Browser TTL: 1 year

#### Rule 2: Bypass Cache for API Routes
- **When incoming requests match**: Custom filter expression
  ```
  (http.request.uri.path starts_with "/api/") or
  (http.request.uri.path contains "/auth/")
  ```
- **Then**:
  - Cache eligibility: Bypass cache

#### Rule 3: Bypass Cache for Download Content
- **When incoming requests match**: Custom filter expression
  ```
  http.request.uri.path matches "/api/downloads/.*/content"
  ```
- **Then**:
  - Cache eligibility: Bypass cache

**Note**: Download content URLs follow pattern: `/api/downloads/{id}/content`

### 2. Page Rules (Alternative if Cache Rules not available)

#### Static Assets
- **URL**: `*yourdomain.com/_next/static/*`
- **Settings**:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year

#### API Routes
- **URL**: `*yourdomain.com/api/*`
- **Settings**:
  - Cache Level: Bypass

### 3. Browser Cache TTL
Set in Cloudflare Dashboard → Caching → Configuration:
- **Browser Cache TTL**: Respect Existing Headers

This allows Next.js to control browser caching via the headers we configured.

### 4. Always Online
- Enable "Always Online" for better availability
- But ensure it doesn't cache authenticated pages

### 5. Development Mode
- Use Development Mode when testing to bypass all caching
- Remember to disable it when done

## Security Settings

### SSL/TLS
- **Mode**: Full (strict)
- **Minimum TLS Version**: TLS 1.2
- **Automatic HTTPS Rewrites**: On
- **Always Use HTTPS**: On

### Firewall Rules
Consider adding:
- Rate limiting for `/api/*` endpoints (e.g., 100 requests/minute)
- Rate limiting for `/login` and `/register` (e.g., 5 requests/minute)

### Bot Fight Mode
- Enable to protect against automated attacks
- But whitelist legitimate bots if needed

## Speed Optimizations

### Auto Minify
- JavaScript: On
- CSS: On
- HTML: On

### Brotli
- Enable Brotli compression

### Early Hints
- Enable for faster page loads

### Rocket Loader
- **OFF** (conflicts with React/Next.js hydration)

## Important Notes

### What to Cache
✅ `/_next/static/*` - Next.js static assets (hashed filenames)
✅ `/images/*` - Static images
✅ Fonts from Google Fonts

### What NOT to Cache
❌ `/api/*` - API routes (especially authenticated)
❌ `/auth/*` - Authentication pages
❌ `/api/downloads/*/content` - User download files (requires Range request support for iOS)
❌ Pages with user-specific content

### Testing Cache
1. Check cache status in response headers: `CF-Cache-Status`
2. Use Chrome DevTools Network tab → Size column
3. Test with: `curl -I https://yourdomain.com/_next/static/...`

### Cache Purge
- After deployment, purge cache for non-static assets
- Static assets (`/_next/static/*`) can stay cached (they have hashed names)

## Recommended Cloudflare Settings Summary

```yaml
Cache:
  - Browser Cache TTL: Respect Existing Headers
  - Crawler Hints: On
  - Always Online: On

Speed:
  - Auto Minify: JS, CSS, HTML all ON
  - Brotli: On
  - Early Hints: On
  - Rocket Loader: OFF

SSL/TLS:
  - Mode: Full (strict)
  - Min TLS: 1.2
  - HTTPS Rewrites: On
  - Always Use HTTPS: On

Security:
  - Bot Fight Mode: On
  - Rate Limiting: Configure for /api/* and auth routes
```

## Verification Commands

```bash
# Check cache headers
curl -I https://yourdomain.com/_next/static/chunks/main.js

# Should see:
# CF-Cache-Status: HIT (or MISS on first request)
# Cache-Control: public, max-age=31536000, immutable

# Check API no-cache
curl -I https://yourdomain.com/api/downloads

# Should see:
# CF-Cache-Status: DYNAMIC
# Cache-Control: no-store, no-cache...
```
