"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Folder, Plus, Trash2 } from "lucide-react";
import { NumberField, RangeField, SelectField, TextField, ToggleField } from "@/components/admin/fields";
import { ImageField } from "@/components/admin/ImageField";
import { UrlField } from "@/components/admin/UrlField";
import { StorageBrowser } from "@/components/admin/StorageBrowser";
import type { GalleryItem, GallerySettings } from "@/lib/widgets/registry";

type SetS = (patch: Partial<GallerySettings>) => void;

export function GalleryContentForm({
  settings,
  set,
  items,
  setItems,
}: {
  settings: GallerySettings;
  set: SetS;
  items: GalleryItem[];
  setItems: (v: GalleryItem[]) => void;
}) {
  const [browse, setBrowse] = useState(false);

  const patch = (i: number, p: Partial<GalleryItem>) =>
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  const add = () => setItems([...items, { imageUrl: "", caption: "", link: "" }]);
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const copy = items.slice();
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setItems(copy);
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => set({ source: "manual" })}
          className={`rounded-md px-3 py-1.5 font-medium ${settings.source === "manual" ? "bg-white shadow-sm" : "text-slate-500"}`}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() => set({ source: "folder" })}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium ${settings.source === "folder" ? "bg-white shadow-sm" : "text-slate-500"}`}
        >
          <Folder size={14} /> CDN folder
        </button>
      </div>

      {settings.source === "folder" ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <span className="mb-1 block text-xs font-medium text-slate-600">Linked folder</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1.5 text-xs text-slate-700">
                {settings.folder ? `/${settings.folder}` : "No folder selected"}
              </code>
              <button
                type="button"
                onClick={() => setBrowse(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Folder size={15} /> Choose
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Images added to this folder on the CDN appear in the gallery automatically.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Order"
              value={settings.sort}
              onChange={(v) => set({ sort: v })}
              options={[
                { value: "name-asc", label: "Name (A→Z)" },
                { value: "name-desc", label: "Name (Z→A)" },
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
              ]}
            />
            <NumberField
              label="Max images (0 = all)"
              min={0}
              max={300}
              value={settings.limit}
              onChange={(v) => set({ limit: v })}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">#{i + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                    className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <ImageField label="Image" value={it.imageUrl} onChange={(v) => patch(i, { imageUrl: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <TextField label="Caption" value={it.caption} onChange={(v) => patch(i, { caption: v })} />
                  <UrlField label="Link (optional)" value={it.link} onChange={(v) => patch(i, { link: v })} />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={15} /> Add image
          </button>
        </div>
      )}

      <StorageBrowser
        open={browse}
        pick="folder"
        onClose={() => setBrowse(false)}
        onSelect={(path) => {
          set({ folder: path });
          setBrowse(false);
        }}
      />
    </div>
  );
}

export function GallerySettingsForm({ settings, set }: { settings: GallerySettings; set: SetS }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <SelectField
        label="Layout"
        value={settings.layout}
        onChange={(v) => set({ layout: v })}
        options={[
          { value: "grid", label: "Grid (cropped)" },
          { value: "masonry", label: "Masonry" },
        ]}
      />
      {settings.layout === "grid" && (
        <SelectField
          label="Crop"
          value={settings.aspect}
          onChange={(v) => set({ aspect: v })}
          options={[
            { value: "square", label: "Square" },
            { value: "4/3", label: "Landscape 4:3" },
            { value: "16/9", label: "Wide 16:9" },
            { value: "3/4", label: "Portrait 3:4" },
            { value: "auto", label: "Original" },
          ]}
        />
      )}
      <RangeField label="Columns" min={1} max={6} value={settings.columns} onChange={(v) => set({ columns: v })} />
      <RangeField label="Gap" min={0} max={40} value={settings.gap} onChange={(v) => set({ gap: v })} suffix="px" />
      <RangeField
        label="Corner radius"
        min={0}
        max={48}
        value={settings.rounded}
        onChange={(v) => set({ rounded: v })}
        suffix="px"
      />
      <div className="col-span-2 grid grid-cols-2 gap-x-4 rounded-md border border-slate-200 p-2">
        <ToggleField label="Lightbox on click" value={settings.lightbox} onChange={(v) => set({ lightbox: v })} />
        <ToggleField label="Show captions" value={settings.showCaptions} onChange={(v) => set({ showCaptions: v })} />
      </div>
    </div>
  );
}
