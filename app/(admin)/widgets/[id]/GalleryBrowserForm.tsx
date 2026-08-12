"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Folder, FolderPlus, Images, ImageUp, Loader2, RefreshCw } from "lucide-react";
import {
  ColorField,
  FontField,
  NumberField,
  RangeField,
  SelectField,
  TextField,
  ToggleField,
} from "@/components/admin/fields";
import { StorageBrowser } from "@/components/admin/StorageBrowser";
import type { GalleryBrowserSettings } from "@/lib/widgets/registry";

type SetS = (patch: Partial<GalleryBrowserSettings>) => void;
type Album = { path: string; name: string; count: number; cover: string };

// A tidy default title from a folder name (matches serve-side prettyFolderName).
function pretty(name: string): string {
  return name.replace(/[-_]+/g, " ").trim() || name;
}

export function GalleryBrowserContentForm({
  settings,
  set,
  onStorageChanged,
}: {
  settings: GalleryBrowserSettings;
  set: SetS;
  onStorageChanged?: () => void;
}) {
  const [browse, setBrowse] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null); // album path being uploaded to, or "__new__"
  const uploadRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string | null>(null);

  const overrides = settings.overrides ?? {};
  const setOverride = (path: string, patch: { display?: boolean; title?: string }) => {
    const cur = overrides[path] ?? { display: true, title: "" };
    set({ overrides: { ...overrides, [path]: { ...cur, ...patch } } });
  };

  const load = useCallback(async (folder: string) => {
    if (!folder) {
      setAlbums([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/storage/albums?path=${encodeURIComponent(folder)}`);
      const d = await res.json();
      if (res.ok) setAlbums(d.albums ?? []);
      else setError(d.error ?? "Couldn't list folders");
    } catch {
      setError("Couldn't list folders");
    }
    setLoading(false);
  }, []);

  async function createAlbum() {
    const name = window.prompt("New album (folder) name");
    if (!name || !name.trim()) return;
    setBusyPath("__new__");
    setError(null);
    try {
      const res = await fetch("/api/admin/storage/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent: settings.folder, name: name.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "Could not create album");
      else {
        await load(settings.folder);
        onStorageChanged?.();
      }
    } catch {
      setError("Could not create album");
    }
    setBusyPath(null);
  }

  function pickUpload(path: string) {
    uploadTarget.current = path;
    uploadRef.current?.click();
  }

  async function doUpload(files: FileList) {
    const path = uploadTarget.current;
    if (!path) return;
    setBusyPath(path);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", path);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error ?? "Upload failed");
          break;
        }
      }
      await load(settings.folder);
      onStorageChanged?.();
    } catch {
      setError("Upload failed");
    }
    setBusyPath(null);
    uploadTarget.current = null;
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh the album list when the parent folder changes
    load(settings.folder);
  }, [settings.folder, load]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 p-3">
        <span className="mb-1 block text-xs font-medium text-slate-600">Parent folder</span>
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
          Each sub-folder becomes an album. New folders added to the CDN appear here automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Album order"
          value={settings.albumSort}
          onChange={(v) => set({ albumSort: v })}
          options={[
            { value: "name-asc", label: "Name (A→Z)" },
            { value: "name-desc", label: "Name (Z→A)" },
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
          ]}
        />
        <SelectField
          label="Photos order (in album)"
          value={settings.imageSort}
          onChange={(v) => set({ imageSort: v })}
          options={[
            { value: "name-asc", label: "Name (A→Z)" },
            { value: "name-desc", label: "Name (Z→A)" },
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
          ]}
        />
      </div>
      <NumberField
        label="Max photos per album (0 = all)"
        min={0}
        max={500}
        value={settings.imageLimit}
        onChange={(v) => set({ imageLimit: v })}
      />

      {settings.folder && (
        <div className="space-y-2">
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) doUpload(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Albums{albums.length ? ` (${albums.length})` : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={createAlbum}
                disabled={busyPath === "__new__"}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-[#094582] hover:bg-[#094582]/10 disabled:opacity-50"
              >
                {busyPath === "__new__" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <FolderPlus size={13} />
                )}
                New album
              </button>
              <button
                type="button"
                onClick={() => load(settings.folder)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}

          {!error && !loading && albums.length === 0 && (
            <div className="rounded-md bg-slate-50 px-3 py-6 text-center text-xs text-slate-400">
              No sub-folders with images found in this folder.
            </div>
          )}

          {albums.map((a) => {
            const ov = overrides[a.path];
            const display = ov?.display !== false;
            return (
              <div
                key={a.path}
                className={`flex items-center gap-3 rounded-lg border p-2.5 ${display ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"}`}
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded bg-slate-100">
                  {a.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Images size={18} className="text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    value={ov?.title ?? ""}
                    onChange={(e) => setOverride(a.path, { title: e.target.value })}
                    placeholder={pretty(a.name)}
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-[#094582] focus:ring-1 focus:ring-[#094582]"
                  />
                  <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                    /{a.path} · {a.count} photo{a.count === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => pickUpload(a.path)}
                  disabled={busyPath === a.path}
                  title="Upload photos to this album"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busyPath === a.path ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <ImageUp size={13} />
                  )}
                  Upload
                </button>
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500">Show</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={display}
                    onClick={() => setOverride(a.path, { display: !display })}
                    className={`relative h-5 w-9 rounded-full transition ${display ? "bg-[#094582]" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${display ? "left-[18px]" : "left-0.5"}`}
                    />
                  </button>
                </label>
              </div>
            );
          })}
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

export function GalleryBrowserSettingsForm({
  settings,
  set,
}: {
  settings: GalleryBrowserSettings;
  set: SetS;
}) {
  const cropOptions = [
    { value: "4/3" as const, label: "Landscape 4:3" },
    { value: "square" as const, label: "Square" },
    { value: "16/9" as const, label: "Wide 16:9" },
    { value: "3/4" as const, label: "Portrait 3:4" },
    { value: "auto" as const, label: "Original" },
  ];
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Album grid</h4>
        <div className="grid grid-cols-2 gap-4">
          <RangeField label="Columns" min={1} max={6} value={settings.columns} onChange={(v) => set({ columns: v })} />
          <RangeField label="Gap" min={0} max={40} value={settings.gap} onChange={(v) => set({ gap: v })} suffix="px" />
          <SelectField label="Cover crop" value={settings.aspect} onChange={(v) => set({ aspect: v })} options={cropOptions} />
          <RangeField label="Corner radius" min={0} max={48} value={settings.rounded} onChange={(v) => set({ rounded: v })} suffix="px" />
          <ColorField label="Title colour" value={settings.titleColor} onChange={(v) => set({ titleColor: v })} />
        </div>
        <div className="grid grid-cols-2 gap-x-4 rounded-md border border-slate-200 p-2">
          <ToggleField label="Show titles" value={settings.showTitles} onChange={(v) => set({ showTitles: v })} />
          <ToggleField label="Show photo count" value={settings.showCount} onChange={(v) => set({ showCount: v })} />
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Album view</h4>
        <div className="grid grid-cols-2 gap-4">
          <RangeField label="Photo columns" min={1} max={6} value={settings.galleryColumns} onChange={(v) => set({ galleryColumns: v })} />
          <RangeField label="Photo gap" min={0} max={40} value={settings.galleryGap} onChange={(v) => set({ galleryGap: v })} suffix="px" />
          <SelectField label="Photo crop" value={settings.galleryAspect} onChange={(v) => set({ galleryAspect: v })} options={cropOptions} />
          <TextField label="Back button label" value={settings.backLabel} onChange={(v) => set({ backLabel: v })} />
          <ColorField label="Accent colour" value={settings.accentColor} onChange={(v) => set({ accentColor: v })} />
          <FontField value={settings.fontFamily} onChange={(v) => set({ fontFamily: v })} />
        </div>
        <div className="grid grid-cols-2 gap-x-4 rounded-md border border-slate-200 p-2">
          <ToggleField label="Lightbox on click" value={settings.lightbox} onChange={(v) => set({ lightbox: v })} />
          <ToggleField label="Show captions" value={settings.showCaptions} onChange={(v) => set({ showCaptions: v })} />
        </div>
      </section>
    </div>
  );
}
