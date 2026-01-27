import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RateLimits, checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { generateVerificationCode, sendVerificationEmail } from "@/lib/email";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;

  if (!email) {
    return NextResponse.redirect(new URL("/register", BASE_URL));
  }

  // Rate limiting check - more restrictive for resend
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";

  const rateLimitResult = await checkRateLimit(`resend:${ip}:${email}`, {
    limit: 3,
    window: 5 * 60 * 1000, // 5 minutes
    key: "resend",
  });

  if (!rateLimitResult.success) {
    const retryMinutes = Math.ceil((rateLimitResult.retryAfter || 0) / 60000);
    return NextResponse.redirect(
      new URL(
        `/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent(`Too many resend attempts. Try again in ${retryMinutes} minutes.`)}`,
        BASE_URL
      )
    );
  }

  try {
    // Check if user exists and is not verified
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL(
          `/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("User not found")}`,
          BASE_URL
        )
      );
    }

    if (user.emailVerified) {
      return NextResponse.redirect(
        new URL("/login?verified=true", BASE_URL)
      );
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: verificationCode,
        expires: expiresAt,
      },
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(
      email,
      verificationCode,
      user.name || email.split("@")[0]
    );

    if (!emailResult.success) {
      console.error("Failed to resend verification email:", emailResult.error);
      return NextResponse.redirect(
        new URL(
          `/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("Failed to send email. Please try again.")}`,
          BASE_URL
        )
      );
    }

    return NextResponse.redirect(
      new URL(
        `/verify?email=${encodeURIComponent(email)}&success=${encodeURIComponent("A new verification code has been sent to your email.")}`,
        BASE_URL
      )
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.redirect(
      new URL(
        `/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent("An error occurred. Please try again.")}`,
        BASE_URL
      )
    );
  }
}
