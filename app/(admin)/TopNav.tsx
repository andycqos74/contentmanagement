"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopNav() {
  const pathname = usePathname();
  const isWidgets = pathname.startsWith("/widgets") || pathname === "/dashboard" || pathname === "/";
  const isNews = pathname.startsWith("/news");
  const isData = pathname.startsWith("/data-sources");
  const isUsers = pathname.startsWith("/users");

  return (
    <nav className="flex" style={{ gap: 2 }}>
      {[
        { href: "/dashboard", label: "Widgets", active: isWidgets },
        { href: "/news", label: "News", active: isNews },
        { href: "/data-sources", label: "Data sources", active: isData },
        { href: "/users", label: "Users", active: isUsers },
      ].map(({ href, label, active }) => (
        <Link
          key={href}
          href={href}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            color: active ? "#0A4B93" : "#475467",
            background: active ? "#EEF4FB" : "transparent",
            textDecoration: "none",
          }}
          className={!active ? "hover:bg-[#F2F4F7]" : ""}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
