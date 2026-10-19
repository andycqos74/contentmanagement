"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import type { PageListItem } from "@/lib/pages/repository";

export function PagesAdmin({ pages }: { pages: PageListItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    const shortName = window.prompt("Short name (used in embed code and URLs, max 50 chars, e.g. about-us)");
    if (!shortName?.trim()) return;
    const title = window.prompt("Page title");
    if (!title?.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortName, title }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) router.push(`/pages/${d.id}`);
    else setError(d.error || "Could not create page");
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#101828" }}>Pages</h1>
        <button
          onClick={create}
          disabled={busy}
          className="flex items-center"
          style={{ gap: 6, height: 36, padding: "0 14px", background: "#0A4B93", color: "#fff", borderRadius: 8, fontSize: 14, fontWeight: 500 }}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} New page
        </button>
      </div>
      {error && <p style={{ color: "#B42318", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 12 }}>
        {pages.length === 0 && <p style={{ padding: 24, color: "#667085", fontSize: 14 }}>No pages found.</p>}
        {pages.map((p) => (
          <Link
            key={p.CMSPageID}
            href={`/pages/${p.CMSPageID}`}
            className="flex items-center justify-between"
            style={{ padding: "12px 16px", borderTop: "1px solid #F2F4F7" }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#101828" }}>{p.CMSPageLongName}</div>
              <div style={{ fontSize: 12, color: "#667085" }}>{p.CMSPageShortName}</div>
            </div>
            <span style={{ fontSize: 12, color: "#667085" }}>{p.CMSLastUpdated ?? ""}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
