import { z } from "zod";

// Private IP ranges that should be blocked
const PRIVATE_IP_PATTERNS = [
  /^127\./,                           // Loopback (127.0.0.0/8)
  /^10\./,                            // Private Class A (10.0.0.0/8)
  /^172\.(1[6-9]|2\d|3[01])\./,      // Private Class B (172.16.0.0/12)
  /^192\.168\./,                      // Private Class C (192.168.0.0/16)
  /^::1$/,                            // IPv6 loopback
  /^fe80:/,                           // IPv6 link-local
  /^fc00:/,                           // IPv6 unique local
  /localhost/i,
];

/**
 * Extract hostname from URL and check if it's a private IP
 */
function isPrivateIP(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Check against private IP patterns
    return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(hostname));
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Validate URL format and check security constraints
 */
export function validateSubmissionUrl(url: string): {
  valid: boolean;
  error?: string;
} {
  // Check if URL is provided
  if (!url || url.trim().length === 0) {
    return { valid: false, error: "URL is required" };
  }

  // Basic URL format validation using URL constructor
  try {
    new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Check for private IP addresses
  if (isPrivateIP(url)) {
    return { valid: false, error: "Private IP addresses are not allowed" };
  }

  // Check protocol - only allow http and https
  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { valid: false, error: "Only HTTP and HTTPS URLs are allowed" };
  }

  return { valid: true };
}

// Zod schema for URL validation
export const submissionUrlSchema = z.object({
  url: z.string()
    .min(1, "URL is required")
    .url("Invalid URL format")
    .refine(
      (url) => !isPrivateIP(url),
      "Private IP addresses are not allowed"
    )
    .refine(
      (url) => {
        const protocol = new URL(url).protocol;
        return ["http:", "https:"].includes(protocol);
      },
      "Only HTTP and HTTPS URLs are allowed"
    ),
  priority: z.number().int().min(0).max(100).optional().default(0),
});

export type SubmissionUrlInput = z.infer<typeof submissionUrlSchema>;
