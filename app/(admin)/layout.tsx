import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";
import { TopNav } from "./TopNav";

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/);
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase();
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userInitials = initials(user.name ?? null, user.email);

  return (
    <div className="min-h-screen" style={{ background: "#F6F7F9" }}>
      {/* Global top bar */}
      <header
        className="sticky top-0 z-40 border-b bg-white"
        style={{ borderColor: "#E4E7EC" }}
      >
        <div
          className="mx-auto flex h-14 items-center justify-between px-7"
          style={{ maxWidth: 1400, gap: 24 }}
        >
          {/* Left cluster */}
          <div className="flex items-center" style={{ gap: 28 }}>
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center" style={{ gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://www.qosfc.com/images/95-trans.png"
                alt="QOSFC"
                style={{ height: 28, width: "auto" }}
              />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: "#101828",
                }}
              >
                QCMS
              </span>
            </Link>

            <TopNav />
          </div>

          {/* Right cluster */}
          <div className="flex items-center" style={{ gap: 12 }}>
            <span style={{ fontSize: 13, color: "#667085" }} className="hidden sm:inline">
              {user.email}
            </span>
            <div
              title={user.name ?? user.email}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "#EEF4FB",
                color: "#0A4B93",
                fontSize: 12,
                fontWeight: 600,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              {userInitials}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 28px 64px" }}>
        {children}
      </main>
    </div>
  );
}
