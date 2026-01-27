import { NextRequest, NextResponse } from "next/server";
import { register } from "@/lib/auth";
import { RateLimits, checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  isAllowedEmailDomain,
  generateVerificationCode,
  sendVerificationEmail,
} from "@/lib/email";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

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
      new URL(`/register?error=${encodeURIComponent(`Too many registration attempts. Try again in ${retryMinutes} minutes.`)}`, BASE_URL)
    );
  }

  // Validation
  if (!email || !password || !confirmPassword) {
    return NextResponse.redirect(new URL("/register?error=missing", BASE_URL));
  }

  if (password !== confirmPassword) {
    return NextResponse.redirect(new URL("/register?error=passwords-do-not-match", BASE_URL));
  }

  // Check email domain restriction early (before registration)
  if (!isAllowedEmailDomain(email)) {
    return NextResponse.redirect(
      new URL(`/register?error=${encodeURIComponent("Registration is by invitation only. Please use an authorized email address.")}`, BASE_URL)
    );
  }

  // Register user (password validation happens in register function)
  const result = await register(email, password);

  if (result.error) {
    return NextResponse.redirect(
      new URL(`/register?error=${encodeURIComponent(result.error)}`, BASE_URL)
    );
  }

  // Generate verification code
  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Store verification code
  // Delete any existing verification tokens for this email first
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

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
    email.split("@")[0]
  );

  if (!emailResult.success) {
    console.error("Failed to send verification email:", emailResult.error);
    // Still redirect to verify page - user can request resend
  }

  // Redirect to verification page
  return NextResponse.redirect(
    new URL(`/verify?email=${encodeURIComponent(email)}`, BASE_URL)
  );
}
