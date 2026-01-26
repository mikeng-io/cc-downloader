import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { register } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await auth();

  if (session) {
    redirect("/downloads");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <form
        action={async (formData) => {
          "use server";
          const email = formData.get("email") as string;
          const password = formData.get("password") as string;
          const confirmPassword = formData.get("confirmPassword") as string;

          // Validation
          if (!email || !password || !confirmPassword) {
            redirect("/register?error=missing");
            return;
          }

          if (password !== confirmPassword) {
            redirect("/register?error=passwords-do-not-match");
            return;
          }

          // Register user (password validation happens in register function)
          const result = await register(email, password);

          if (result.error) {
            redirect(`/register?error=${encodeURIComponent(result.error)}`);
            return;
          }

          // Redirect to login on success
          redirect("/login?registered=true");
        }}
        className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800"
      >
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Start downloading media with CC-Downloader
          </p>
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
              minLength={12}
              className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              12+ characters with 3 of: uppercase, lowercase, numbers, symbols
            </p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 dark:text-white">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={12}
              className="mt-1 block w-full rounded-md border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Create Account
          </button>
        </div>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
