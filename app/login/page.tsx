import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(from || "/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-lg bg-[#094582] text-lg font-bold text-white">
            W
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Widget CMS</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage your widgets</p>
        </div>
        <LoginForm from={from ?? "/dashboard"} />
      </div>
    </div>
  );
}
