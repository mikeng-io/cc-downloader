import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
import { prisma } from "./prisma";
import { isAllowedEmailDomain } from "./email";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          // Still do dummy comparison to prevent timing attacks
          await compare(credentials.password as string, "$2a$12$dummy.hash.for.timing.attack.protection");
          return null;
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("Please verify your email address before signing in.");
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
          throw new Error(`Account temporarily locked. Try again in ${minutesLeft} minutes.`);
        }

        // Verify password using bcrypt
        const isValid = await compare(credentials.password as string, user.password || "");

        if (!isValid) {
          // Increment failed login attempts
          const newAttempts = (user.failedLoginAttempts || 0) + 1;

          // Lock account after 5 failed attempts for 15 minutes
          const lockUntil = newAttempts >= 5
            ? new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
            : null;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newAttempts,
              lockedUntil: lockUntil,
              lastFailedLogin: new Date(),
            },
          });

          // Reset attempts if lock period has expired
          if (user.lockedUntil && user.lockedUntil <= new Date()) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: 1,
                lockedUntil: null,
              },
            });
          }

          return null;
        }

        // Reset failed login attempts on successful login
        if (user.failedLoginAttempts > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: null,
              lastFailedLogin: null,
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours (reduced from 30 days for security)
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

/**
 * Common passwords that should be rejected
 * Source: https://github.com/danielmiessler/SecLists
 */
const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123",
  "monkey", "1234567", "letmein", "trustno1", "dragon",
  "baseball", "111111", "iloveyou", "master", "sunshine",
  "ashley", "bailey", "passw0rd", "shadow", "123123",
  "654321", "superman", "qazwsx", "michael", "football",
]);

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Object with valid status and error message if invalid
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
  score?: number;
  feedback?: string[];
} {
  // Check minimum length
  if (password.length < 12) {
    return {
      valid: false,
      error: "Password must be at least 12 characters long",
      score: 0,
    };
  }

  // Check for common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      valid: false,
      error: "This password is too common. Please choose a stronger one.",
      score: 0,
    };
  }

  // Check character variety
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const varietyCount = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(Boolean).length;

  if (varietyCount < 3) {
    return {
      valid: false,
      error: "Password must contain at least 3 of: uppercase, lowercase, numbers, special characters",
      score: 1,
      feedback: [
        !hasUpperCase && "Add uppercase letters" || undefined,
        !hasLowerCase && "Add lowercase letters" || undefined,
        !hasNumber && "Add numbers" || undefined,
        !hasSpecial && "Add special characters" || undefined,
      ].filter(Boolean) as string[],
    };
  }

  // If zxcvbn is available, use it for additional strength checking
  try {
    // Dynamic import to avoid issues if package isn't installed
    const zxcvbn = require("zxcvbn");
    const result = zxcvbn.default(password);

    if (result.score < 3) {
      return {
        valid: false,
        error: "Password is too weak. Please add more variety or length.",
        score: result.score,
        feedback: result.feedback.suggestions,
      };
    }

    return { valid: true, score: result.score };
  } catch {
    // Fallback if zxcvbn is not available
    return { valid: true, score: 3 };
  }
}

/**
 * Register a new user with secure password hashing
 * @param email User's email address
 * @param password User's password (will be hashed)
 * @returns Object with success status or error message
 */
export async function register(email: string, password: string) {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { error: "Invalid email address" };
    }

    // Check if email domain is allowed
    if (!isAllowedEmailDomain(email)) {
      return { error: "Registration is restricted to authorized email domains only" };
    }

    // Check password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return { error: passwordValidation.error };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "User already exists" };
    }

    // Hash password with bcrypt (12 rounds for security)
    const hashedPassword = await hash(password, 12);

    // Create user with hashed password (email not yet verified)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: email.split("@")[0], // Use email prefix as name
        emailVerified: null, // Requires email verification
      },
    });

    return { success: true, userId: user.id };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Failed to create user" };
  }
}
