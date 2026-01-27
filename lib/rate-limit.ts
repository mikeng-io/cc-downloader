import { redis } from "@/lib/redis";

/**
 * Rate limiter using Redis (shared with BullMQ)
 * Prevents brute force attacks on sensitive endpoints
 */

interface RateLimitOptions {
  /**
   * Maximum number of requests allowed
   */
  limit: number;

  /**
   * Time window in milliseconds
   */
  window: number;

  /**
   * Unique identifier for this rate limit (e.g., "login", "register")
   */
  key: string;
}

interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  success: boolean;

  /**
   * Remaining requests in this window
   */
  remaining: number;

  /**
   * When the window resets (milliseconds since epoch)
   */
  resetAt: number;

  /**
   * Time until reset (milliseconds)
   */
  retryAfter?: number;
}

/**
 * Check rate limit for a given identifier
 * @param identifier Unique identifier (e.g., email, IP address)
 * @param options Rate limit options
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { limit, window, key } = options;
  const now = Date.now();
  const windowStart = Math.floor(now / window) * window;
  const redisKey = `ratelimit:${key}:${identifier}:${windowStart}`;

  try {
    // Increment counter
    const current = await redis.incr(redisKey);

    // Set expiration on first request in window
    if (current === 1) {
      await redis.expire(redisKey, Math.ceil(window / 1000));
    }

    const remaining = Math.max(0, limit - current);
    const resetAt = windowStart + window;

    if (current > limit) {
      return {
        success: false,
        remaining: 0,
        resetAt,
        retryAfter: resetAt - now,
      };
    }

    return {
      success: true,
      remaining,
      resetAt,
    };
  } catch (error) {
    // If Redis fails, allow request (fail-open)
    console.error("Rate limit check failed:", error);
    return {
      success: true,
      remaining: limit,
      resetAt: now + window,
    };
  }
}

/**
 * Express/Next.js middleware for rate limiting
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
  return async (
    request: Request,
    identifier: string
  ): Promise<{ allowed: boolean; headers: Record<string, string> }> => {
    const result = await checkRateLimit(identifier, options);

    const headers: Record<string, string> = {
      "X-RateLimit-Limit": options.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.resetAt.toString(),
    };

    if (!result.success) {
      headers["Retry-After"] = Math.ceil((result.retryAfter || 0) / 1000).toString();
      return { allowed: false, headers };
    }

    return { allowed: true, headers };
  };
}

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  // Authentication endpoints: 5 attempts per minute
  auth: {
    limit: 5,
    window: 60 * 1000, // 1 minute
    key: "auth",
  },

  // Registration: 3 attempts per hour
  register: {
    limit: 3,
    window: 60 * 60 * 1000, // 1 hour
    key: "register",
  },

  // API endpoints: 100 requests per minute
  api: {
    limit: 100,
    window: 60 * 1000, // 1 minute
    key: "api",
  },

  // Download creation: 10 per minute
  downloadCreate: {
    limit: 10,
    window: 60 * 1000, // 1 minute
    key: "download_create",
  },
};

/**
 * Get client IP address from request
 */
export function getClientIp(request: Request): string {
  // Check various headers for IP address
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip"); // Cloudflare

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default (not ideal but prevents crashes)
  return "unknown";
}
