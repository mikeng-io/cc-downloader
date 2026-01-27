"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { StorageQuotaDisplay } from "@/components/storage-quota-display";
import { auth, signOut } from "@/lib/auth";
import { useEffect, useState } from "react";

export function Navbar() {
  const [session, setSession] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fetch session on mount
    fetch("/api/auth/session")
      .then(res => res.json())
      .then(data => setSession(data))
      .catch(() => setSession(null));
  }, []);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <nav className="border-b bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main nav row */}
        <div className="flex h-16 justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              Downloader
            </Link>
            {session?.user && (
              <div className="flex items-center gap-6 text-sm">
                <Link href="/downloads" className="font-sans text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  Downloads
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session?.user ? (
              <>
                <span className="hidden text-sm text-gray-600 dark:text-gray-400 sm:block">
                  {session.user.email}
                </span>
                <form
                  action={async () => {
                    await fetch("/api/auth/signout", { method: "POST" });
                    window.location.href = "/";
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Storage quota moved to homepage - removed duplicate */}
      </div>
    </nav>
  );
}
