import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { RateLimits, checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Rate limiting check
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";

  const rateLimitResult = await checkRateLimit(`login:${ip}:${email}`, RateLimits.auth);

  if (!rateLimitResult.success) {
    const retryMinutes = Math.ceil((rateLimitResult.retryAfter || 0) / 60000);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(`Too many attempts. Try again in ${retryMinutes} minutes.`)}`, request.url)
    );
  }

  // Attempt sign in
  try {
    await signIn("credentials", { email, password });
    // signIn will redirect on success
  } catch (error) {
    // Sign in will redirect on success, or throw on failure
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Invalid email or password")}`, request.url)
    );
  }

  // This shouldn't be reached, but just in case
  return NextResponse.redirect(new URL("/downloads", request.url));
}
