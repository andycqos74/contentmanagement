"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import { Field, TextField } from "@/components/admin/fields";
import { RichText } from "@/components/admin/RichText";

type Initial = {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: "DRAFT" | "PUBLISHED";
  dirtySincePublish: boolean;
};

export function PageEditor({ initial, appUrl }: { initial: Initial; appUrl: string }) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [content, setContent] = useState(initial.content);
  const [status, setStatus] = useState(initial.status);
  const [unpublished, setUnpublished] = useState(initial.dirtySincePublish || initial.status === "DRAFT");
  const [busy, setBusy] = useState<"" | "save" | "publish">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState("");

  const base = appUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const snippet = `<div data-cms-page="${slug}"></div>\n<script src="${base}/embed.js" async></script>`;

  async function save(): Promise<boolean> {
    const res = await fetch(`/api/admin/pages/${initial.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, content }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg({ ok: false, text: d.error || "Save failed" });
      return false;
    }
    setSlug(d.page.slug);
    setUnpublished(true);
    return true;
  }

  async function onSave() {
    setBusy("save");
    setMsg(null);
    if (await save()) setMsg({ ok: true, text: "Draft saved" });
    setBusy("");
  }

  async function onPublish() {
    setBusy("publish");
    setMsg(null);
    if (await save()) {
      const res = await fetch(`/api/admin/pages/${initial.id}/publish`, { method: "POST" });
      if (res.ok) {
        setStatus("PUBLISHED");
        setUnpublished(false);
        setMsg({ ok: true, text: "Published" });
      } else setMsg({ ok: false, text: "Publish failed" });
    }
    setBusy("");
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
          {status === "PUBLISHED" && unpublished && !msg && (
            <span style={{ fontSize: 13, color: "#B54708" }}>Unpublished changes</span>
          )}
          <button onClick={onSave} disabled={!!busy} style={{ ...btn, background: "#fff", border: "1px solid #D0D5DD", color: "#344054" }}>
            {busy === "save" ? <Loader2 size={15} className="animate-spin" /> : "Save draft"}
          </button>
          <button onClick={onPublish} disabled={!!busy} style={{ ...btn, background: "#0A4B93", color: "#fff" }}>
            {busy === "publish" ? <Loader2 size={15} className="animate-spin" /> : "Publish"}
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 12, padding: 20 }}>
        <div className="grid" style={{ gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginBottom: 16 }}>
          <TextField label="Title" value={title} onChange={setTitle} />
          <TextField label="URL slug" value={slug} onChange={setSlug} hint={`Public page: /p/${slug}`} />
        </div>
        <Field label="Content">
          <RichText value={content} onChange={setContent} height={560} />
        </Field>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 12, padding: 20, marginTop: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Show on your website</h2>
        <p style={{ fontSize: 13, color: "#667085", marginBottom: 14 }}>
          Published content only. The embed renders inline (no iframe) in an isolated Shadow DOM so your site&apos;s
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
