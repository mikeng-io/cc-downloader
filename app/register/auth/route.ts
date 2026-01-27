import { NextRequest, NextResponse } from "next/server";
import { register } from "@/lib/auth";
import { RateLimits, checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Rate limiting check
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";

  const rateLimitResult = await checkRateLimit(`register:${ip}:${email}`, RateLimits.register);

  if (!rateLimitResult.success) {
    const retryMinutes = Math.ceil((rateLimitResult.retryAfter || 0) / 60000);
    return NextResponse.redirect(
      new URL(`/register?error=${encodeURIComponent(`Too many registration attempts. Try again in ${retryMinutes} minutes.`)}`, request.url)
    );
  }

  // Validation
  if (!email || !password || !confirmPassword) {
    return NextResponse.redirect(new URL("/register?error=missing", request.url));
  }

  if (password !== confirmPassword) {
    return NextResponse.redirect(new URL("/register?error=passwords-do-not-match", request.url));
  }

  // Register user (password validation happens in register function)
  const result = await register(email, password);

  if (result.error) {
    return NextResponse.redirect(
      new URL(`/register?error=${encodeURIComponent(result.error)}`, request.url)
    );
  }

  // Redirect to login on success
  return NextResponse.redirect(new URL("/login?registered=true", request.url));
}
