import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { resolvePostLoginRedirect } from "@/lib/auth/role-routing";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams?: {
    redirect?: string;
    error?: string;
  };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Validate current session against the database on the server
  const user = await getSessionUser();

  // If already authenticated and active, redirect to role dashboard (or authorized requested redirect)
  if (user && user.isActive) {
    const destination = resolvePostLoginRedirect(user.role, searchParams?.redirect);
    redirect(destination);
  }

  // Unauthenticated or expired/deactivated sessions see the login form
  return (
    <LoginForm
      initialRedirect={searchParams?.redirect}
      initialError={searchParams?.error}
    />
  );
}
