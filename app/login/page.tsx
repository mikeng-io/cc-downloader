import { signIn } from "@/lib/auth";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RateLimits, checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export default async function LoginPage(props: { searchParams: Promise<{ registered?: string; error?: string }> }) {
  const session = await auth();
  const searchParams = await props.searchParams;

  if (session) {
    redirect("/downloads");
  }

  // Handle registration success message
  const showRegisteredMessage = searchParams.registered === "true";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <form
        action={async (formData) => {
          "use server";
          const email = formData.get("email") as string;
          const password = formData.get("password") as string;

          // Rate limiting check
          const headersList = headers();
          const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";

          const rateLimitResult = await checkRateLimit(`login:${ip}:${email}`, RateLimits.auth);

          if (!rateLimitResult.success) {
            const retryMinutes = Math.ceil((rateLimitResult.retryAfter || 0) / 60000);
            redirect(`/login?error=${encodeURIComponent(`Too many attempts. Try again in ${retryMinutes} minutes.`)}`);
          }

          // Attempt sign in
          try {
            await signIn("credentials", { email, password });
          } catch (error) {
            // Sign in will redirect on success, or throw on failure
            redirect(`/login?error=${encodeURIComponent("Invalid email or password")}`);
          }
        }}
        className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800"
      >
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sign in to CC-Downloader
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your credentials to access your downloads
          </p>
          {showRegisteredMessage && (
            <div className="mt-4 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
              <p className="text-sm text-green-800 dark:text-green-200">
                Registration successful! Please sign in with your credentials.
              </p>
            </div>
          )}
          {searchParams.error && (
            <div className="mt-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
              <p className="text-sm text-red-800 dark:text-red-200">
                {searchParams.error}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-white">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-white">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Sign in
          </button>
        </div>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{" "}
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
