"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import { Field, TextField } from "@/components/admin/fields";
import { RichText } from "@/components/admin/RichText";

type Initial = { id: number; shortName: string; title: string; content: string };

export function PageEditor({ initial, appUrl }: { initial: Initial; appUrl: string }) {
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState("");

  const slug = initial.shortName;
  const base = appUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const snippet = `<div data-cms-page="${slug}"></div>\n<script src="${base}/embed.js" async></script>`;

  // Saves write straight to the live cms_pages row.
  async function onSave() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/pages/${initial.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? { ok: true, text: "Saved (live)" } : { ok: false, text: d.error || "Save failed" });
    setBusy(false);
  }

  function copy(key: string, text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    });
  }

  const btn: React.CSSProperties = { height: 36, padding: "0 14px", borderRadius: 8, fontSize: 14, fontWeight: 500 };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 20, gap: 12 }}>
        <Link href="/pages" className="flex items-center" style={{ gap: 6, fontSize: 14, color: "#475467" }}>
          <ArrowLeft size={15} /> Pages
        </Link>
        <div className="flex items-center" style={{ gap: 10 }}>
          {msg && <span style={{ fontSize: 13, color: msg.ok ? "#067647" : "#B42318" }}>{msg.text}</span>}
          <button onClick={onSave} disabled={busy} style={{ ...btn, background: "#0A4B93", color: "#fff" }}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : "Save"}
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 12, padding: 20 }}>
        <div className="grid" style={{ gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginBottom: 16 }}>
          <TextField label="Title" value={title} onChange={setTitle} />
          <Field label="Short name" hint="Fixed - used by the site and embed code">
            <input value={slug} readOnly className="w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm" />
          </Field>
        </div>
        <Field label="Content">
          <RichText value={content} onChange={setContent} height={560} />
        </Field>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 12, padding: 20, marginTop: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Show on your website</h2>
        <p style={{ fontSize: 13, color: "#667085", marginBottom: 14 }}>
          The embed renders inline (no iframe) in an isolated Shadow DOM so your site&apos;s
          CSS can&apos;t break it. Add <code>data-cms-title=&quot;true&quot;</code> to show the title.
        </p>
        {[
          { key: "embed", label: "Inline embed", text: snippet },
          { key: "url", label: "Hosted page URL", text: `${base}/p/${slug}` },
          { key: "api", label: "JSON API", text: `${base}/api/pages/${slug}` },
        ].map((r) => (
          <div key={r.key} style={{ marginBottom: 12 }}>
            <div className="flex items-center justify-between" style={{ fontSize: 12, fontWeight: 500, color: "#475467", marginBottom: 4 }}>
              {r.label}
              <button onClick={() => copy(r.key, r.text)} className="flex items-center" style={{ gap: 4, color: "#0A4B93" }}>
                {copied === r.key ? <Check size={13} /> : <Copy size={13} />} {copied === r.key ? "Copied" : "Copy"}
              </button>
            </div>
            <pre style={{ background: "#F6F7F9", borderRadius: 8, padding: 10, fontSize: 12, overflowX: "auto", margin: 0 }}>{r.text}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
