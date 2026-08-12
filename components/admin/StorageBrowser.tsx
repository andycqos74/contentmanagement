"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  File as FileIcon,
  Folder,
  FolderPlus,
  ImageUp,
  Loader2,
  X,
} from "lucide-react";

type Entry = {
  name: string;
  isDir: boolean;
  path: string;
  url: string | null;
  size?: number;
  mime?: string;
};
type Listing = { path: string; parentPath: string | null; entries: Entry[] };

const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;
function isImage(e: Entry) {
  return (e.mime?.startsWith("image/") ?? false) || IMAGE_RE.test(e.name);
}

// Lazy-loaded thumbnail that degrades to a file icon if the image can't load.
function Thumb({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FileIcon className="text-slate-400" size={26} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}

// A modal file browser over the configured storage backend. Folders are
// navigable; selecting a file returns its public URL.
export function StorageBrowser({
  open,
  filter = "all",
  pick = "file",
  onClose,
  onSelect,
}: {
  open: boolean;
  filter?: "image" | "all";
  pick?: "file" | "folder";
  onClose: () => void;
  onSelect: (value: string) => void; // file: public URL; folder: folder path
}) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/storage/browse?path=${encodeURIComponent(p)}`);
      const d = await res.json();
      if (res.ok) setListing(d);
      else setError(d.error ?? "Couldn't list storage");
    } catch {
      setError("Couldn't list storage");
    }
    setLoading(false);
  }, []);

  const here = listing?.path ?? "";

  async function newFolder() {
    const name = window.prompt("New folder name");
    if (!name || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/storage/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent: here, name: name.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "Could not create folder");
      else await load(here);
    } catch {
      setError("Could not create folder");
    }
    setBusy(false);
  }

  async function uploadFiles(files: FileList) {
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        if (here) fd.append("folder", here);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error ?? "Upload failed");
          break;
        }
      }
      await load(here);
    } catch {
      setError("Upload failed");
    }
    setBusy(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the listing when the browser opens
    if (open) load("");
  }, [open, load]);

  if (!open) return null;

  const entries = (listing?.entries ?? []).filter((e) =>
    pick === "folder" ? e.isDir : e.isDir || filter === "all" || isImage(e),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              disabled={!listing || listing.parentPath === null}
              onClick={() => load(listing?.parentPath ?? "")}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              aria-label="Up one level"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-semibold text-slate-900">
              {pick === "folder" ? "Choose a folder" : "Storage"}
            </h2>
            <span className="truncate text-xs text-slate-400">/{listing?.path ?? ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={newFolder}
              disabled={busy || !listing}
              title="Create a folder here"
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <FolderPlus size={14} /> Folder
            </button>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              disabled={busy || !listing}
              title="Upload images here"
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ImageUp size={14} />} Upload
            </button>
            {pick === "folder" && (
              <button
                type="button"
                onClick={() => onSelect(listing?.path ?? "")}
                disabled={!listing}
                className="rounded-md bg-[#094582] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0b3f70] disabled:opacity-50"
              >
                Use this folder
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-[240px] flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid h-40 place-items-center text-slate-400">
              <Loader2 className="animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : entries.length === 0 ? (
            <div className="grid h-40 place-items-center text-sm text-slate-400">Empty folder</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {entries.map((e) =>
                e.isDir ? (
                  <button
                    key={`d:${e.path}`}
                    type="button"
                    onClick={() => load(e.path)}
                    className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-3 hover:border-[#094582] hover:bg-slate-50"
                  >
                    <Folder className="text-[#094582]" size={30} />
                    <span className="w-full truncate text-center text-xs text-slate-700">
                      {e.name}
                    </span>
                  </button>
                ) : (
                  <button
                    key={`f:${e.path}`}
                    type="button"
                    onClick={() => e.url && onSelect(e.url)}
                    className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-2 hover:border-[#094582]"
                    title={e.name}
                  >
                    <div className="grid h-20 w-full place-items-center overflow-hidden rounded bg-slate-100">
                      {isImage(e) && e.url ? (
                        <Thumb url={e.url} name={e.name} />
                      ) : (
                        <FileIcon className="text-slate-400" size={26} />
                      )}
                    </div>
                    <span className="w-full truncate text-center text-xs text-slate-700">
                      {e.name}
                    </span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
