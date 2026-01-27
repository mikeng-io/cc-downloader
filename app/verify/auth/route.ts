import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RateLimits, checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;

  // Rate limiting check
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";

  const rateLimitResult = await checkRateLimit(`verify:${ip}:${email}`, RateLimits.auth);

  if (!rateLimitResult.success) {
    const retrySeconds = Math.ceil((rateLimitResult.retryAfter || 0) / 1000);
    return NextResponse.redirect(
      new URL(
        `/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent(`Too many attempts. Try again in ${retrySeconds} seconds.`)}`,
        BASE_URL
      )
    );
  }

  // Validation
  if (!email || !code) {
    return NextResponse.redirect(
      new URL(
        `/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Missing verification code")}`,
        BASE_URL
      )
    );
  }

  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    return NextResponse.redirect(
      new URL(
        `/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Invalid verification code format")}`,
        BASE_URL
      )
    );
  }

  try {
    // Find verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: code,
      },
    });

    if (!verificationToken) {
      return NextResponse.redirect(
        new URL(
          `/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Invalid verification code")}`,
          BASE_URL
        )
      );
    }

    // Check if token has expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token,
          },
        },
      });

      return NextResponse.redirect(
        new URL(
          `/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Verification code has expired. Please request a new one.")}`,
          BASE_URL
        )
      );
    }

    // Mark user as verified
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    // Delete the verification token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    // Redirect to login with success message
    return NextResponse.redirect(
      new URL("/login?verified=true", BASE_URL)
    );
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(
      new URL(
        `/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("An error occurred during verification")}`,
        BASE_URL
      )
    );
  }
}
