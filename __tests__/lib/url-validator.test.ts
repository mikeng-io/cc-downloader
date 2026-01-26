import { describe, it, expect } from "vitest";
import { validateSubmissionUrl, submissionUrlSchema } from "@/lib/url-validator";

describe("URL Validator", () => {
  describe("validateSubmissionUrl", () => {
    it("should accept valid HTTP URLs", () => {
      const result = validateSubmissionUrl("http://example.com/video.mp4");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept valid HTTPS URLs", () => {
      const result = validateSubmissionUrl("https://example.com/video.mp4");
      expect(result.valid).toBe(true);
    });

    it("should reject empty URLs", () => {
      const result = validateSubmissionUrl("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("URL is required");
    });

    it("should reject invalid URL format", () => {
      const result = validateSubmissionUrl("not-a-url");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid URL format");
    });

    it("should reject loopback addresses (127.0.0.0/8)", () => {
      const result = validateSubmissionUrl("http://127.0.0.1/file.mp4");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP addresses are not allowed");
    });

    it("should reject localhost", () => {
      const result = validateSubmissionUrl("http://localhost/file.mp4");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private IP addresses are not allowed");
    });

    it("should reject private Class A (10.0.0.0/8)", () => {
      const result = validateSubmissionUrl("http://10.0.0.1/file.mp4");
      expect(result.valid).toBe(false);
    });

    it("should reject private Class B (172.16.0.0/12)", () => {
      const result = validateSubmissionUrl("http://172.16.0.1/file.mp4");
      expect(result.valid).toBe(false);
    });

    it("should reject private Class C (192.168.0.0/16)", () => {
      const result = validateSubmissionUrl("http://192.168.1.1/file.mp4");
      expect(result.valid).toBe(false);
    });

    it("should reject IPv6 loopback", () => {
      const result = validateSubmissionUrl("http://::1/file.mp4");
      expect(result.valid).toBe(false);
    });

    it("should reject non-HTTP protocols", () => {
      const result = validateSubmissionUrl("ftp://example.com/file.mp4");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Only HTTP and HTTPS URLs are allowed");
    });

    it("should accept public IPs", () => {
      const result = validateSubmissionUrl("http://8.8.8.8/file.mp4");
      expect(result.valid).toBe(true);
    });
  });

  describe("submissionUrlSchema", () => {
    it("should validate correct URLs", () => {
      const result = submissionUrlSchema.safeParse({
        url: "https://example.com/video.mp4",
        priority: 5,
      });
      expect(result.success).toBe(true);
    });

    it("should require URL field", () => {
      const result = submissionUrlSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("required");
      }
    });

    it("should validate URL format", () => {
      const result = submissionUrlSchema.safeParse({
        url: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("should enforce priority range", () => {
      const result = submissionUrlSchema.safeParse({
        url: "https://example.com/video.mp4",
        priority: 150,
      });
      expect(result.success).toBe(false);
    });

    it("should default priority to 0", () => {
      const result = submissionUrlSchema.safeParse({
        url: "https://example.com/video.mp4",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe(0);
      }
    });
  });
});
