import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await auth();

  if (session) {
    redirect("/downloads");
  }

  return <RegisterForm />;
}
