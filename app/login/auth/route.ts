import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { RateLimits, checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

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
      new URL(`/login?error=${encodeURIComponent(`Too many attempts. Try again in ${retryMinutes} minutes.`)}`, BASE_URL)
    );
  }

  // Attempt sign in
  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("Invalid email or password")}`, BASE_URL)
      );
    }

    // Redirect to downloads on success
    return NextResponse.redirect(new URL("/downloads", BASE_URL));
  } catch (error) {
    // NextAuth wraps errors in CallbackRouteError with structure: { cause: { err: Error } }
    const cause = (error as { cause?: { err?: Error } })?.cause;
    const originalError = cause?.err;
    const errorMessage = originalError?.message || (error instanceof Error ? error.message : "");

    // Check if the error is due to unverified email
    if (errorMessage.includes("verify your email")) {
      return NextResponse.redirect(
        new URL(`/verify?email=${encodeURIComponent(email)}`, BASE_URL)
      );
    }

    // Check if account is locked
    if (errorMessage.includes("Account temporarily locked")) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorMessage)}`, BASE_URL)
      );
    }

    console.error("Login error:", error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("An error occurred during login")}`, BASE_URL)
    );
  }
}
