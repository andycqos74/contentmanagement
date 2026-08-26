import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#094582] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded bg-white/15 text-sm font-bold">
                W
              </span>
              Widget CMS
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/dashboard" className="rounded px-3 py-1.5 hover:bg-white/10">
                Widgets
              </Link>
              <Link href="/news" className="rounded px-3 py-1.5 hover:bg-white/10">
                News
              </Link>
              <Link href="/data-sources" className="rounded px-3 py-1.5 hover:bg-white/10">
                Data sources
              </Link>
              <Link href="/users" className="rounded px-3 py-1.5 hover:bg-white/10">
                Users
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-white/80 sm:inline">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
