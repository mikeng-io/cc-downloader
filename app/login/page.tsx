import { signIn } from "@/lib/auth";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Already logged in. Redirecting...</p>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        "use server";
        await signIn("credentials", formData);
      }}
      className="flex min-h-screen items-center justify-center"
    >
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        <div>
          <h2 className="text-3xl font-bold">Sign in to CC-Downloader</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your credentials to access your downloads
          </p>
        </div>
        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border px-3 py-2 shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-md border px-3 py-2 shadow-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        </div>
      </div>
    </form>
  );
}
