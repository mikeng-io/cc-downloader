import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage(props: { searchParams: Promise<{ registered?: string; error?: string }> }) {
  const session = await auth();
  const searchParams = await props.searchParams;

  if (session) {
    redirect("/downloads");
  }

  return <LoginForm registered={searchParams.registered === "true"} />;
}
