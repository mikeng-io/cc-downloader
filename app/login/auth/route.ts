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
    console.error("Login error:", error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("An error occurred during login")}`, BASE_URL)
    );
  }
}
