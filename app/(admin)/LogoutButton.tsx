"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      style={{
        height: 30,
        padding: "0 10px",
        border: "1px solid #E4E7EC",
        borderRadius: 8,
        fontSize: 12.5,
        fontWeight: 500,
        color: "#475467",
        background: "#fff",
        cursor: "pointer",
      }}
      className="hover:bg-[#F2F4F7]"
    >
      Sign out
    </button>
  );
}
