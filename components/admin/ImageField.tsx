"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { Field } from "@/components/admin/fields";

// A URL input that also lets you upload an image file to Combined Storage; on
// success it fills the field with the returned public CDN URL.
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
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload"
          className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#094582] focus:ring-1 focus:ring-[#094582]"
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
  );
}
