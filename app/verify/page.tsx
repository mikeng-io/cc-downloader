import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { VerifyForm } from "@/components/verify-form";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; success?: string }>;
}) {
  const session = await auth();

  // If already logged in, redirect to downloads
  if (session?.user) {
    redirect("/downloads");
  }

  const params = await searchParams;
  const email = params.email || "";
  const error = params.error || "";
  const success = params.success || "";

  if (!email) {
    redirect("/register");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-on-surface">Verify your email</h2>
          <p className="mt-2 text-on-surface-variant">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
        </div>

        {error && (
          <p className="text-sm text-error text-center bg-error/10 rounded-md p-3">
            {decodeURIComponent(error)}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-600 text-center bg-green-100 dark:bg-green-900/30 rounded-md p-3">
            {decodeURIComponent(success)}
          </p>
        )}

        <VerifyForm email={email} />

        <p className="text-center text-sm text-on-surface-variant">
          Didn&apos;t receive the code?{" "}
          <form action="/verify/resend" method="POST" className="inline">
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              className="text-primary hover:underline font-medium"
            >
              Resend code
            </button>
          </form>
        </p>

        <p className="text-center text-sm text-on-surface-variant">
          Wrong email?{" "}
          <a href="/register" className="text-primary hover:underline">
            Go back to registration
          </a>
        </p>
      </div>
    </main>
  );
}
