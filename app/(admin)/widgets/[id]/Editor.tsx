"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  Trash2,
  X,
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

  const [tab, setTab] = useState<"content" | "design">("content");
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
  const [embedOpen, setEmbedOpen] = useState(false);
  const [galleryFolderItems, setGalleryFolderItems] = useState<Record<string, unknown>[]>([]);
  const [galleryBrowserAlbums, setGalleryBrowserAlbums] = useState<Record<string, unknown>[]>([]);
  const [storageTick, setStorageTick] = useState(0); // bumped when the editor creates a folder / uploads

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
    settings.order,
    settings.imageOrder,
    settings.imageSort,
    settings.imageLimit,
    storageTick,
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

  const secBtn: React.CSSProperties = {
    height: 36,
    padding: "0 14px",
    background: "#fff",
    border: "1px solid #D0D5DD",
    borderRadius: 9,
    fontSize: 13.5,
    fontWeight: 500,
    color: "#344054",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <div style={{ margin: "-32px -28px 0" }}>
      {/* Sticky sub-header */}
      <div
        className="sticky z-30 border-b bg-white"
        style={{ top: 56, borderColor: "#E4E7EC" }}
      >
        <div
          className="mx-auto flex flex-wrap items-center justify-between"
          style={{ maxWidth: 1400, padding: "0 28px", minHeight: 62, gap: 20 }}
        >
          {/* Left */}
          <div className="flex items-center" style={{ gap: 12 }}>
            <Link
              href="/dashboard"
              style={{
                width: 32,
                height: 32,
                display: "grid",
                placeItems: "center",
                border: "1px solid #E4E7EC",
                borderRadius: 8,
                color: "#475467",
                textDecoration: "none",
              }}
              className="hover:bg-[#F2F4F7]"
            >
              <ArrowLeft size={15} />
            </Link>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                border: "1px solid transparent",
                background: "transparent",
                padding: "5px 8px",
                borderRadius: 7,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#101828",
                width: 210,
                outline: "none",
              }}
              className="hover:border-[#E4E7EC] focus:border-[#0A4B93]"
            />
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 6,
                background: "#F2F4F7",
                color: "#475467",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {def.label}
            </span>
            <span
              style={{
                height: 23,
                padding: "0 9px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                background: status === "PUBLISHED" ? "#ECFDF3" : "#FFFAEB",
                border: `1px solid ${status === "PUBLISHED" ? "#ABEFC6" : "#FEDF89"}`,
                color: status === "PUBLISHED" ? "#067647" : "#B54708",
              }}
            >
              {status === "PUBLISHED" ? "Published" : "Draft"}
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center" style={{ gap: 8 }}>
            {saving && (
              <span style={{ fontSize: 13, color: "#B54708", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#F79009", display: "inline-block" }} />
                Unsaved changes
              </span>
            )}
            <button type="button" onClick={() => setEmbedOpen(true)} style={secBtn} className="hover:bg-[#F9FAFB]">
              Embed code
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{ ...secBtn, opacity: saving ? 0.6 : 1 }}
              className="hover:bg-[#F9FAFB]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : savedTick ? <Check size={14} /> : null}
              {savedTick ? "Saved" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={publish}
              style={{
                height: 36,
                padding: "0 18px",
                background: "#0A4B93",
                color: "#fff",
                borderRadius: 9,
                fontSize: 13.5,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
              className="hover:bg-[#073A75]"
            >
              Publish
            </button>
            <button
              type="button"
              onClick={remove}
              style={{
                width: 32,
                height: 32,
                display: "grid",
                placeItems: "center",
                border: "none",
                background: "transparent",
                color: "#98A2B3",
                cursor: "pointer",
                borderRadius: 7,
              }}
              className="hover:bg-red-50 hover:text-red-600"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className="mx-auto"
        style={{ maxWidth: 1400, padding: "20px 28px 64px" }}
      >
        <div
          className={`grid gap-5 ${expanded ? "grid-cols-1" : ""}`}
          style={
            !expanded
              ? { gridTemplateColumns: "392px minmax(0,1fr)", alignItems: "start" }
              : undefined
          }
        >
          {/* Control panel */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #E4E7EC",
              borderRadius: 12,
              ...(expanded ? { order: 2 } : {}),
            }}
          >
            {/* Tab strip */}
            <div
              className="flex"
              style={{
                padding: 6,
                gap: 4,
                background: "#FAFBFC",
                borderBottom: "1px solid #E4E7EC",
              }}
            >
              {(["content", "design"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t as typeof tab)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: tab === t ? "#fff" : "transparent",
                    color: tab === t ? "#101828" : "#667085",
                    boxShadow: tab === t ? "0 1px 2px rgba(16,24,40,.10)" : "none",
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ padding: 18 }}>
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
                    onStorageChanged={() => setStorageTick((t) => t + 1)}
                  />
                ) : (
                  <div className="space-y-4">
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#667085", margin: "0 0 10px" }}>
                      Where does the content come from?
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                        marginBottom: 22,
                      }}
                    >
                      {[
                        { val: "MANUAL" as const, title: "Type it in", desc: "Add articles by hand" },
                        { val: "DATA" as const, title: "From the database", desc: "Stays up to date on its own" },
                      ].map(({ val, title, desc }) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setContentSource(val)}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            border: `1px solid ${contentSource === val ? "#0A4B93" : "#E4E7EC"}`,
                            background: contentSource === val ? "#EEF4FB" : "#fff",
                            boxShadow: contentSource === val ? "0 0 0 1px #0A4B93" : "none",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#101828" }}>{title}</div>
                          <div style={{ fontSize: 12, color: "#667085", marginTop: 3 }}>{desc}</div>
                        </button>
                      ))}
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
                          <div
                            className="flex items-center"
                            style={{
                              gap: 8,
                              padding: "11px 13px",
                              background: "#ECFDF3",
                              border: "1px solid #ABEFC6",
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#067647",
                            }}
                          >
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#17B26A", flexShrink: 0 }} />
                            {previewLoading ? "Loading…" : `${previewItems.length} articles found — shown in the preview`}
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
            </div>
          </div>

          {/* Preview / canvas */}
          <div style={expanded ? { order: 1 } : { position: "sticky", top: 130 }}>
            <div className="mb-2 flex items-center justify-between" style={{ fontSize: 13, color: "#344054" }}>
              <span style={{ fontWeight: 600 }}>
                {isBanner || isSlider ? "Canvas — drag & resize" : "Preview"}
              </span>
              <div className="flex items-center" style={{ gap: 8 }}>
                {contentSource === "DATA" && previewLoading && (
                  <span className="inline-flex items-center" style={{ gap: 4, fontSize: 12.5, color: "#98A2B3" }}>
                    <Loader2 size={12} className="animate-spin" /> updating
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  style={{ fontSize: 12.5 }}
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
                <div
                  style={{
                    background: "#EFF1F4",
                    border: "1px solid #E4E7EC",
                    borderRadius: 12,
                    padding: "28px 24px",
                    minHeight: 520,
                  }}
                >
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: 10,
                      padding: 22,
                      boxShadow: "0 1px 3px rgba(16,24,40,.08)",
                    }}
                  >
                    {previewData.length === 0 && contentSource === "DATA" ? (
                      <div className="grid h-40 place-items-center text-sm" style={{ color: "#98A2B3" }}>
                        {binding.table ? "No rows matched your query." : "Select a data source and table."}
                      </div>
                    ) : (
                      <WidgetRenderer type={initial.type} settings={settings} items={previewData} />
                    )}
                  </div>
                </div>
              )}
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Embed drawer */}
      {embedOpen && (
        <div
          className="fixed inset-0 z-[60] flex justify-end"
          style={{ background: "rgba(16,24,40,.45)" }}
          onClick={() => setEmbedOpen(false)}
        >
          <div
            className="flex flex-col"
            style={{
              width: 440,
              height: "100%",
              background: "#fff",
              padding: 24,
              gap: 18,
              boxShadow: "-20px 0 60px rgba(16,24,40,.24)",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "#101828",
                    margin: 0,
                  }}
                >
                  Put it on the site
                </h2>
                <p style={{ fontSize: 13.5, color: "#667085", marginTop: 4 }}>
                  Paste this once, wherever the widget should appear.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEmbedOpen(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "#F2F4F7",
                  border: "none",
                  cursor: "pointer",
                  color: "#475467",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Code block */}
            <div style={{ position: "relative" }}>
              <pre
                style={{
                  padding: "16px 44px 16px 16px",
                  background: "#0F1729",
                  borderRadius: 11,
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: "#E4E7EC",
                  overflowX: "auto",
                  margin: 0,
                }}
              >
                {embedSnippet}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(embedSnippet);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 28,
                  padding: "0 10px",
                  background: "rgba(255,255,255,.12)",
                  borderRadius: 7,
                  border: "none",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Status note */}
            <div
              className="flex items-start"
              style={{
                padding: "12px 13px",
                background: status === "PUBLISHED" ? "#ECFDF3" : "#FFFAEB",
                border: `1px solid ${status === "PUBLISHED" ? "#ABEFC6" : "#FEDF89"}`,
                borderRadius: 10,
                gap: 8,
                fontSize: 13,
                lineHeight: 1.5,
                color: status === "PUBLISHED" ? "#067647" : "#B54708",
              }}
            >
              {status === "PUBLISHED"
                ? "This widget is published, so the snippet is live. Later edits stay hidden until you publish again."
                : "Publish the widget to make this embed live."}
            </div>

            {/* API */}
            <div style={{ borderTop: "1px solid #F2F4F7", paddingTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#667085", marginBottom: 8 }}>
                Or read the raw data
              </p>
              <code
                style={{
                  display: "block",
                  padding: "9px 11px",
                  background: "#F9FAFB",
                  border: "1px solid #E4E7EC",
                  borderRadius: 8,
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 11.5,
                  color: "#344054",
                  overflowX: "auto",
                }}
              >
                {appUrl}/api/widgets/{initial.id}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
