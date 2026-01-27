"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "actify";

interface LoginFormProps {
  registered?: boolean;
  verified?: boolean;
}

export function LoginForm({ registered, verified }: LoginFormProps) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Sign in to Downloader
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Enter your credentials to access your downloads
            </p>
          </div>

          {/* Messages */}
          {verified && (
            <div className="mb-4 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
              <p className="text-sm text-green-800 dark:text-green-200">
                Email verified successfully! You can now sign in.
              </p>
            </div>
          )}
          {registered && !verified && (
            <div className="mb-4 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
              <p className="text-sm text-green-800 dark:text-green-200">
                Registration successful! Please sign in with your credentials.
              </p>
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-200">
                {decodeURIComponent(error)}
              </p>
            </div>
          )}

          {/* Form */}
          <form action="/login/auth" method="POST" className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-900 dark:text-white">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-900 dark:text-white">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>

            <Button
              variant="filled"
              type="submit"
              className="w-full"
            >
              Sign in
            </Button>
          </form>

          {/* Register Link */}
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
