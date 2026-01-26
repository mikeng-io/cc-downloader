import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function Navbar() {
  const session = await auth();

  return (
    <nav className="border-b bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              CC-Downloader
            </Link>
            {session?.user && (
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="/downloads" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  Downloads
                </Link>
                <Link href="/docs" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  API Docs
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {session?.user ? (
              <>
                <span className="hidden text-sm text-gray-600 dark:text-gray-400 sm:block">
                  {session.user.email}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut();
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
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
