# Download Content Caching Strategy

## The Question
Should we cache `/api/downloads/{id}/content` (user's downloaded media)?

## Three Strategies

### Strategy 1: Browser Cache Only (CURRENT - Recommended for Security)

**How it works:**
```
Cache-Control: private, max-age=3600
CDN-Cache-Control: no-store
```

**Pros:**
- ✅ Secure - Each user only caches their own files
- ✅ Faster repeat views (browser cache)
- ✅ No Cloudflare cache means no privacy concerns
- ✅ Works perfectly with Range requests (iOS video)
- ✅ Free bandwidth savings (browser cache)

**Cons:**
- ❌ Cloudflare serves full file on every NEW user request
- ❌ No bandwidth savings at origin server

**When to use:**
- You have private/authenticated content
- Security is more important than bandwidth costs
- Files are small-to-medium sized

**Cloudflare config:** Bypass cache for `/api/downloads/*/content`

---

### Strategy 2: Cloudflare Cache with Authentication (Complex but Optimal)

**How it works:**
1. Generate signed temporary URLs with expiry
2. Cloudflare caches these signed URLs
3. URLs auto-expire after time period

**Implementation needed:**
```typescript
// Generate signed URL with 1-hour expiry
const signedUrl = `/api/downloads/${id}/content?token=${signature}&expires=${timestamp}`;
```

**Pros:**
- ✅ Cloudflare caches and serves files (huge bandwidth savings)
- ✅ Still secure (signed URLs expire)
- ✅ Best performance for users

**Cons:**
- ❌ More complex to implement
- ❌ Need to handle URL signing and verification
- ❌ URLs expire, need to regenerate

**Cloudflare config:**
- Cache signed URLs
- Set TTL to match expiry time
- Bypass cache for non-signed URLs

---

### Strategy 3: Public Cloudflare Cache (NOT RECOMMENDED - Security Risk)

**How it works:**
```
Cache-Control: public, max-age=31536000
```

**Cloudflare caches everything.**

**Pros:**
- ✅ Maximum performance
- ✅ Lowest bandwidth costs

**Cons:**
- ❌ **SECURITY RISK**: Anyone with the URL can access cached content
- ❌ Once cached on Cloudflare, authentication is bypassed
- ❌ Privacy violation - Cloudflare serves user A's file to user B

**When to use:**
- **ONLY** if content is truly public (no authentication needed)
- Never use for private user files

---

## Current Implementation

**Strategy 1** is implemented:
- Browser caches for 1 hour
- Cloudflare does NOT cache
- Secure and works with iOS Range requests

## Recommended for Your Use Case

**If content is private (user authentication required):**
→ **Keep Strategy 1** (current)

**If you want Cloudflare caching to save bandwidth:**
→ **Implement Strategy 2** (signed URLs)

**Never use Strategy 3 for authenticated content**

---

## How to Implement Strategy 2 (Signed URLs)

If you want maximum performance + security, here's the approach:

### 1. Create URL signing utility

```typescript
// lib/signed-urls.ts
import crypto from 'crypto';

const SECRET = process.env.URL_SIGNING_SECRET!;

export function signUrl(path: string, expiresInSeconds: number = 3600) {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const message = `${path}:${expires}`;
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(message)
    .digest('base64url');

  return `${path}?expires=${expires}&signature=${signature}`;
}

export function verifyUrl(path: string, expires: number, signature: string): boolean {
  // Check expiry
  if (Math.floor(Date.now() / 1000) > expires) {
    return false;
  }

  // Verify signature
  const message = `${path}:${expires}`;
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(message)
    .digest('base64url');

  return signature === expected;
}
```

### 2. Update content route

```typescript
// app/api/downloads/[id]/content/route.ts

// Check signed URL first (bypass auth if valid signature)
const expires = request.nextUrl.searchParams.get('expires');
const signature = request.nextUrl.searchParams.get('signature');

if (expires && signature) {
  const isValid = verifyUrl(
    `/api/downloads/${id}/content`,
    parseInt(expires, 10),
    signature
  );

  if (!isValid) {
    return NextResponse.json({ error: "Invalid or expired URL" }, { status: 403 });
  }

  // Valid signed URL - serve with cache
  headers.set('Cache-Control', 'public, max-age=3600');
} else {
  // Regular authenticated request - check session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // No cache for authenticated requests
  headers.set('Cache-Control', 'private, no-cache');
}
```

### 3. Generate signed URLs in UI

```typescript
// When user clicks "View" or "Download"
const response = await fetch(`/api/downloads/${id}/sign`);
const { signedUrl } = await response.json();

// Use signedUrl instead of direct content URL
```

### 4. Cloudflare config

Cache signed URLs:
```
http.request.uri.query contains "expires=" and http.request.uri.query contains "signature="
→ Cache for 1 hour
```

---

## Decision Matrix

| Requirement | Strategy 1 | Strategy 2 | Strategy 3 |
|-------------|-----------|-----------|-----------|
| Security | ✅ High | ✅ High | ❌ Low |
| Performance | ⚠️ Medium | ✅ High | ✅ High |
| Bandwidth Savings | ⚠️ Browser only | ✅ CDN + Browser | ✅ CDN + Browser |
| Implementation | ✅ Simple | ⚠️ Complex | ✅ Simple |
| iOS Compatibility | ✅ Works | ✅ Works | ✅ Works |

## Current Setup Summary

✅ **Strategy 1 is active**
- Secure by default
- Works with authentication
- Browser caching provides some benefits
- Cloudflare does NOT cache (bypass rule needed)
