"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Database,
  Loader2,
  Maximize2,
  Minimize2,
  PencilLine,
  Trash2,
} from "lucide-react";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import {
  dataBindingSchema,
  getWidgetDef,
  type BannerElement,
  type BannerSettings,
  type CookieConsentSettings,
  type DataBinding,
  type GalleryBrowserSettings,
  type GalleryItem,
  type GallerySettings,
  type SliderSettings,
  type SliderSlide,
  type HeroSettings,
  type HeroSlide,
  type NewsItem,
  type NewsSettings,
  type WidgetTypeKey,
} from "@/lib/widgets/registry";
import {
  HeroContentEditor,
  HeroSettingsForm,
  NewsContentEditor,
  NewsSettingsForm,
} from "./forms-settings";
import { DataBindingForm } from "./DataBindingForm";
import { BannerControls } from "./BannerControls";
import { BannerCanvas } from "./BannerCanvas";
import { BannerSettingsForm } from "./BannerSettingsForm";
import { CookieConsentForm } from "./CookieConsentForm";
import { SliderControls } from "./SliderControls";
import { SliderStage } from "./SliderStage";
import { SliderSettingsForm } from "./SliderSettingsForm";
import { GalleryContentForm, GallerySettingsForm } from "./GalleryForm";
import { GalleryBrowserContentForm, GalleryBrowserSettingsForm } from "./GalleryBrowserForm";
import { ErrorBoundary } from "@/components/admin/ErrorBoundary";

type Initial = {
  id: string;
  name: string;
  type: WidgetTypeKey;
  status: "DRAFT" | "PUBLISHED";
  contentSource: "MANUAL" | "DATA";
  settings: unknown;
  dataSourceId: string | null;
  dataBinding: unknown;
  items: unknown[];
  publishedAt: string | null;
};

export function Editor({
  initial,
  dataSources,
  appUrl,
}: {
  initial: Initial;
  dataSources: { id: string; name: string; database: string }[];
  appUrl: string;
}) {
  const router = useRouter();
  const def = getWidgetDef(initial.type);
  const isBanner = initial.type === "BANNER";
  const isCookie = initial.type === "COOKIE_CONSENT";
  const isSlider = initial.type === "SLIDER";
  const isGallery = initial.type === "GALLERY";
  const isGalleryBrowser = initial.type === "GALLERY_BROWSER";

  const [name, setName] = useState(initial.name);
  const [settings, setSettings] = useState<Record<string, unknown>>(() =>
    def.settingsSchema.parse(initial.settings ?? {}) as Record<string, unknown>,
  );
  const [contentSource, setContentSource] = useState(initial.contentSource);
  const [dataSourceId, setDataSourceId] = useState<string | null>(initial.dataSourceId);
  const [binding, setBinding] = useState<DataBinding>(() =>
    dataBindingSchema.parse(initial.dataBinding ?? {}),
  );
  const [items, setItems] = useState<Record<string, unknown>[]>(() =>
    (initial.items ?? []).map((x) => def.itemSchema.parse(x ?? {}) as Record<string, unknown>),
  );

  const [tab, setTab] = useState<"content" | "design" | "embed">("content");
  const [status, setStatus] = useState(initial.status);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [previewItems, setPreviewItems] = useState<Record<string, unknown>[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [galleryFolderItems, setGalleryFolderItems] = useState<Record<string, unknown>[]>([]);
  const [galleryBrowserAlbums, setGalleryBrowserAlbums] = useState<Record<string, unknown>[]>([]);

  // Live data preview (debounced) when in DATA mode.
  useEffect(() => {
    if (contentSource !== "DATA" || !dataSourceId || !binding.table) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale preview rows when leaving data mode
      setPreviewItems([]);
      return;
    }
    const t = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const res = await fetch(`/api/admin/widgets/${initial.id}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataSourceId, dataBinding: binding }),
        });
        const d = await res.json();
        if (res.ok) setPreviewItems(d.items ?? []);
        else setPreviewError(d.error ?? "Preview failed");
      } catch {
        setPreviewError("Preview failed");
      }
      setPreviewLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [contentSource, dataSourceId, binding, initial.id]);

  // Live folder preview for a folder-linked gallery (images auto-listed from the CDN).
  useEffect(() => {
    if (!isGallery || settings.source !== "folder") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear preview when not in folder mode
      setGalleryFolderItems([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const q = new URLSearchParams({
          path: String(settings.folder ?? ""),
          sort: String(settings.sort ?? "name-asc"),
          limit: String(settings.limit ?? 0),
        });
        const res = await fetch(`/api/admin/storage/gallery?${q}`);
        const d = await res.json();
        setGalleryFolderItems(res.ok ? (d.items ?? []) : []);
      } catch {
        setGalleryFolderItems([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [isGallery, settings.source, settings.folder, settings.sort, settings.limit]);

  // Live album preview for a gallery browser — resolves the folder's sub-folders
  // (with inline images) exactly as the published embed will, so unsaved
  // display/title/sort changes preview immediately.
  useEffect(() => {
    if (!isGalleryBrowser || !settings.folder) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear preview when no folder is chosen
      setGalleryBrowserAlbums([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/storage/gallery-browser`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings }),
        });
        const d = await res.json();
        setGalleryBrowserAlbums(res.ok ? (d.albums ?? []) : []);
      } catch {
        setGalleryBrowserAlbums([]);
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-resolve only when a content-affecting field changes
  }, [
    isGalleryBrowser,
    settings.folder,
    settings.overrides,
    settings.albumSort,
    settings.imageSort,
    settings.imageLimit,
  ]);

  const galleryFolderMode = isGallery && settings.source === "folder";
  const previewData = isGalleryBrowser
    ? galleryBrowserAlbums
    : galleryFolderMode
      ? galleryFolderItems
      : contentSource === "MANUAL"
        ? items
        : previewItems;

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    const res = await fetch(`/api/admin/widgets/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, settings, contentSource, dataSourceId, dataBinding: binding, items }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1500);
      router.refresh();
      return true;
    }
    const d = await res.json().catch(() => ({}));
    alert(d.error ?? "Save failed");
    return false;
  }, [initial.id, name, settings, contentSource, dataSourceId, binding, items, router]);

  const publish = useCallback(async () => {
    if (!(await save())) return;
    const res = await fetch(`/api/admin/widgets/${initial.id}/publish`, { method: "POST" });
    if (res.ok) {
      setStatus("PUBLISHED");
      router.refresh();
    } else {
      alert("Publish failed");
    }
  }, [save, initial.id, router]);

  const remove = useCallback(async () => {
    if (!confirm("Delete this widget? This cannot be undone.")) return;
    await fetch(`/api/admin/widgets/${initial.id}`, { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }, [initial.id, router]);

  const setSettingsPatch = (p: Record<string, unknown>) =>
    setSettings((s) => ({ ...s, ...p }));

  const embedSnippet = isCookie
    ? `<script src="${appUrl}/consent.js" data-cms-widget="${initial.id}" async></script>`
    : `<div data-cms-widget="${initial.id}"></div>\n<script src="${appUrl}/embed.js" async></script>`;

  return (
    <div>
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <PencilLine size={15} className="text-slate-400" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-transparent px-1 text-lg font-semibold text-slate-900 hover:border-slate-300 focus:border-[#094582] focus:outline-none"
            />
          </div>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {def.label}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {status === "PUBLISHED" ? "Published" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={remove}
            className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : savedTick ? <Check size={15} /> : null}
            {savedTick ? "Saved" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={publish}
            className="rounded-md bg-[#094582] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3f70]"
          >
            Publish
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${expanded ? "grid-cols-1" : "lg:grid-cols-[minmax(0,420px)_1fr]"}`}>
        {/* Editing panel */}
        <div className={`rounded-xl border border-slate-200 bg-white ${expanded ? "order-2" : ""}`}>
          <div className="flex border-b border-slate-200 text-sm">
            {(["content", "design", "embed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 font-medium capitalize ${
                  tab === t
                    ? "border-b-2 border-[#094582] text-[#094582]"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === "content" &&
              (isBanner ? (
                <BannerControls
                  items={items as BannerElement[]}
                  setItems={(v) => setItems(v as Record<string, unknown>[])}
                  selectedId={selectedElId}
                  setSelectedId={setSelectedElId}
                />
              ) : isSlider ? (
                <SliderControls
                  items={items as SliderSlide[]}
                  setItems={(v) => setItems(v as Record<string, unknown>[])}
                  currentSlide={currentSlide}
                  selectedElId={selectedElId}
                  setSelectedElId={setSelectedElId}
                />
              ) : isCookie ? (
                <CookieConsentForm
                  settings={settings as unknown as CookieConsentSettings}
                  set={setSettingsPatch}
                  section="content"
                />
              ) : isGallery ? (
                <GalleryContentForm
                  settings={settings as unknown as GallerySettings}
                  set={setSettingsPatch}
                  items={items as unknown as GalleryItem[]}
                  setItems={(v) => setItems(v as unknown as Record<string, unknown>[])}
                />
              ) : isGalleryBrowser ? (
                <GalleryBrowserContentForm
                  settings={settings as unknown as GalleryBrowserSettings}
                  set={setSettingsPatch}
                />
              ) : (
                <div className="space-y-4">
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm">
                    <button
                      type="button"
                      onClick={() => setContentSource("MANUAL")}
                      className={`rounded-md px-3 py-1.5 font-medium ${contentSource === "MANUAL" ? "bg-white shadow-sm" : "text-slate-500"}`}
                    >
                      Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentSource("DATA")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium ${contentSource === "DATA" ? "bg-white shadow-sm" : "text-slate-500"}`}
                    >
                      <Database size={14} /> Data source
                    </button>
                  </div>

                  {contentSource === "MANUAL" ? (
                    initial.type === "HERO_SLIDER" ? (
                      <HeroContentEditor items={items as HeroSlide[]} setItems={(v) => setItems(v)} />
                    ) : (
                      <NewsContentEditor items={items as NewsItem[]} setItems={(v) => setItems(v)} />
                    )
                  ) : (
                    <div className="space-y-3">
                      <DataBindingForm
                        dataSources={dataSources}
                        dataFields={def.dataFields}
                        dataSourceId={dataSourceId}
                        setDataSourceId={setDataSourceId}
                        binding={binding}
                        setBinding={setBinding}
                      />
                      {previewError && (
                        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                          {previewError}
                        </div>
                      )}
                      {!previewError && binding.table && (
                        <div className="text-xs text-slate-500">
                          {previewLoading ? "Loading…" : `${previewItems.length} row(s) matched.`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

            {tab === "design" &&
              (initial.type === "HERO_SLIDER" ? (
                <HeroSettingsForm
                  settings={settings as unknown as HeroSettings}
                  set={setSettingsPatch}
                />
              ) : initial.type === "BANNER" ? (
                <BannerSettingsForm
                  settings={settings as unknown as BannerSettings}
                  set={setSettingsPatch}
                />
              ) : initial.type === "COOKIE_CONSENT" ? (
                <CookieConsentForm
                  settings={settings as unknown as CookieConsentSettings}
                  set={setSettingsPatch}
                  section="design"
                />
              ) : initial.type === "SLIDER" ? (
                <SliderSettingsForm
                  settings={settings as unknown as SliderSettings}
                  set={setSettingsPatch}
                />
              ) : initial.type === "GALLERY" ? (
                <GallerySettingsForm
                  settings={settings as unknown as GallerySettings}
                  set={setSettingsPatch}
                />
              ) : initial.type === "GALLERY_BROWSER" ? (
                <GalleryBrowserSettingsForm
                  settings={settings as unknown as GalleryBrowserSettings}
                  set={setSettingsPatch}
                />
              ) : (
                <NewsSettingsForm
                  settings={settings as unknown as NewsSettings}
                  set={setSettingsPatch}
                />
              ))}

            {tab === "embed" && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Paste this snippet into any website where the widget should appear:
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 pr-10 text-xs text-slate-100">
                    {embedSnippet}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(embedSnippet);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="absolute right-2 top-2 rounded p-1.5 text-slate-300 hover:bg-white/10"
                    title="Copy"
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
                {status !== "PUBLISHED" && (
                  <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Publish the widget to make this embed live.
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  JSON API:{" "}
                  <code className="rounded bg-slate-100 px-1">
                    {appUrl}/api/widgets/{initial.id}
                  </code>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Live preview / banner canvas */}
        <div className={expanded ? "order-1" : "lg:sticky lg:top-6 lg:self-start"}>
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>{isBanner || isSlider ? "Canvas — drag & resize" : "Live preview"}</span>
            <div className="flex items-center gap-2">
              {contentSource === "DATA" && previewLoading && (
                <span className="inline-flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> updating
                </span>
              )}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                title={expanded ? "Collapse editor width" : "Expand canvas to full width"}
              >
                {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                {expanded ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>
          <ErrorBoundary resetKey={settings}>
          {isBanner ? (
            <BannerCanvas
              settings={settings as unknown as BannerSettings}
              items={items as BannerElement[]}
              setItems={(v) => setItems(v as Record<string, unknown>[])}
              selectedId={selectedElId}
              setSelectedId={setSelectedElId}
            />
          ) : isSlider ? (
            <SliderStage
              settings={settings as unknown as SliderSettings}
              items={items as SliderSlide[]}
              setItems={(v) => setItems(v as Record<string, unknown>[])}
              currentSlide={currentSlide}
              setCurrentSlide={setCurrentSlide}
              selectedElId={selectedElId}
              setSelectedElId={setSelectedElId}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
              {previewData.length === 0 && contentSource === "DATA" ? (
                <div className="grid h-40 place-items-center text-sm text-slate-400">
                  {binding.table
                    ? "No rows matched your query."
                    : "Select a data source and table."}
                </div>
              ) : (
                <WidgetRenderer type={initial.type} settings={settings} items={previewData} />
              )}
            </div>
          )}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
