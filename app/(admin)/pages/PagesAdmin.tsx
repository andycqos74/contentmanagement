"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Row = { id: string; title: string; slug: string; status: "DRAFT" | "PUBLISHED"; updatedAt: string };

export function PagesAdmin({ pages }: { pages: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    const title = window.prompt("Page title");
    if (!title?.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) router.push(`/pages/${d.page.id}`);
    else setError(d.error || "Could not create page");
  }

  async function remove(p: Row) {
    if (!window.confirm(`Delete "${p.title}"? Embeds of this page will stop working.`)) return;
    const res = await fetch(`/api/admin/pages/${p.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else setError("Delete failed");
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
        {pages.length === 0 && (
          <p style={{ padding: 24, color: "#667085", fontSize: 14 }}>No pages yet. Create one to start writing.</p>
        )}
        {pages.map((p) => (
          <div key={p.id} className="flex items-center justify-between" style={{ padding: "12px 16px", borderTop: "1px solid #F2F4F7" }}>
            <Link href={`/pages/${p.id}`} style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#101828" }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "#667085" }}>/p/{p.slug}</div>
            </Link>
            <span style={{ fontSize: 12, fontWeight: 600, marginRight: 16, color: p.status === "PUBLISHED" ? "#067647" : "#B54708" }}>
              {p.status === "PUBLISHED" ? "Published" : "Draft"}
            </span>
            <button onClick={() => remove(p)} aria-label={`Delete ${p.title}`} style={{ color: "#667085" }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
