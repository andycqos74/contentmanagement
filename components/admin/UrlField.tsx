"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { Field } from "@/components/admin/fields";
import { StorageBrowser } from "@/components/admin/StorageBrowser";

// A URL text input with a "Browse" button to pick any file from storage.
export function UrlField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [browse, setBrowse] = useState(false);
  return (
    <>
      <Field label={label}>
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? "https://… or browse"}
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#094582] focus:ring-1 focus:ring-[#094582]"
          />
          <button
            type="button"
            onClick={() => setBrowse(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FolderOpen size={14} /> Browse
          </button>
        </div>
      </Field>
      <StorageBrowser
        open={browse}
        filter="all"
        onClose={() => setBrowse(false)}
        onSelect={(url) => {
          onChange(url);
          setBrowse(false);
        }}
      />
    </>
  );
}
