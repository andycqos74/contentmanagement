"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Cookie,
  GalleryHorizontalEnd,
  Images,
  Newspaper,
  RectangleHorizontal,
} from "lucide-react";
import { WIDGET_LIST, type WidgetTypeKey } from "@/lib/widgets/registry";

const ICONS: Record<WidgetTypeKey, React.ComponentType<{ size?: number }>> = {
  HERO_SLIDER: Images,
  LATEST_NEWS: Newspaper,
  BANNER: RectangleHorizontal,
  COOKIE_CONSENT: Cookie,
  SLIDER: GalleryHorizontalEnd,
};

export default function NewWidgetPage() {
  const router = useRouter();
  const [type, setType] = useState<WidgetTypeKey>("HERO_SLIDER");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    setCreating(true);
    const res = await fetch("/api/admin/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name }),
    });
    const d = await res.json();
    if (res.ok) router.push(`/widgets/${d.widget.id}`);
    else {
      setCreating(false);
      alert(d.error ?? "Failed to create widget");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={15} /> Back
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">New widget</h1>
      <p className="mb-6 text-sm text-slate-500">Choose a widget type to start with.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {WIDGET_LIST.map((w) => {
          const Icon = ICONS[w.key];
          const selected = type === w.key;
          return (
            <button
              key={w.key}
              type="button"
              onClick={() => setType(w.key)}
              className={`rounded-xl border p-5 text-left transition ${
                selected
                  ? "border-[#094582] bg-[#094582]/5 ring-1 ring-[#094582]"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#094582] text-white">
                <Icon size={20} />
              </span>
              <h3 className="mt-3 font-semibold text-slate-900">{w.label}</h3>
              <p className="mt-1 text-xs text-slate-500">{w.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <label className="mb-1 block text-xs font-medium text-slate-600">Widget name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Homepage hero"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#094582] focus:ring-1 focus:ring-[#094582]"
        />
        <button
          type="button"
          onClick={create}
          disabled={creating}
          className="mt-4 w-full rounded-md bg-[#094582] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3f70] disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create widget"}
        </button>
      </div>
    </div>
  );
}
