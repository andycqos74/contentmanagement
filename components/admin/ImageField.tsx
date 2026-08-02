"use client";

import { useRef, useState } from "react";
import { FolderOpen, ImageUp, Loader2 } from "lucide-react";
import { Field } from "@/components/admin/fields";
import { StorageBrowser } from "@/components/admin/StorageBrowser";

// A URL input that can also upload a file to storage or browse existing files;
// either way it fills the field with the resulting public URL.
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.url) onChange(d.url);
      else setError(d.error ?? "Upload failed");
    } catch {
      setError("Upload failed");
    }
    setUploading(false);
  }

  return (
    <>
      <Field label={label}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… , upload or browse"
            className="min-w-[8rem] flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#094582] focus:ring-1 focus:ring-[#094582]"
          />
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageUp size={14} />}
            Upload
          </button>
          <button
            type="button"
            onClick={() => setBrowse(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FolderOpen size={14} /> Browse
          </button>
        </div>
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="mt-2 h-16 rounded border border-slate-200 object-cover"
          />
        )}
        {error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}
      </Field>
      <StorageBrowser
        open={browse}
        filter="image"
        onClose={() => setBrowse(false)}
        onSelect={(url) => {
          onChange(url);
          setBrowse(false);
        }}
      />
    </>
  );
}
