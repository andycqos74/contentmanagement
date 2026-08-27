"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MoreHorizontal, Plus, Search } from "lucide-react";
import { categoryColor } from "@/lib/colors";
import { Field, TextField } from "@/components/admin/fields";
import { ImageField } from "@/components/admin/ImageField";
import { RichText } from "@/components/admin/RichText";

type Lookup = { Id: number; Text: string };
type ListItem = {
  NewsID: number;
  Headline: string | null;
  CategoryShortName: string | null;
  PublishDate: string | null;
  UserID: string | null;
  ImageUrl: string | null;
  Sticky?: number;
};
type DataSource = { id: string; name: string; host: string; database: string };

type ApiState = {
  configured: boolean;
  contentDataSourceId: string | null;
  dataSources: DataSource[];
  list?: ListItem[];
  categories?: Lookup[];
  staff?: Lookup[];
  fixtures?: Lookup[];
  error?: string;
};

type EditModel = {
  NewsID: number;
  categoryId: string;
  subjectId: string;
  fixtureId: string;
  Headline: string;
  ItemText: string;
  PublishDate: string;
  UserID: string;
  NewCustomImage: string;
  TWPostText: string;
  FBPostText: string;
  Sticky: number;
};

const PUBLIC_SITE = (
  process.env.NEXT_PUBLIC_CONTENT_SITE_URL || "https://www.qosfc.com"
).replace(/\/+$/, "");

function displayImage(url: string | null): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return url;
  if (url.startsWith("~")) return PUBLIC_SITE + url.slice(1);
  if (url.startsWith("/")) return PUBLIC_SITE + url;
  return url;
}

function toLocalInput(dbValue: string | null | undefined): string {
  if (!dbValue) return nowLocalInput();
  const m = dbValue.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (m) return `${m[1]}T${m[2]}`;
  const d = new Date(dbValue);
  return Number.isNaN(d.getTime()) ? nowLocalInput() : toLocalInput(fmtLocal(d));
}
function nowLocalInput(): string {
  return fmtLocal(new Date()).slice(0, 16).replace(" ", "T");
}
function fmtLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}
function fmtListDate(v: string | null): string {
  if (!v) return "";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}` : v;
}

const HATCH = "repeating-linear-gradient(135deg,#EDEFF3 0 7px,#F5F6F8 7px 14px)";

// Legacy articles in the DB were stored with HTML-entity-encoded tags
// (e.g. &lt;p&gt; instead of <p>). Decode them so TinyMCE receives proper HTML.
function decodeHtmlEntities(html: string): string {
  if (!html || typeof document === "undefined") return html;
  const el = document.createElement("textarea");
  el.innerHTML = html;
  return el.value;
}

const inputCls =
  "w-full rounded-[9px] border border-[#D0D5DD] px-3 text-sm outline-none focus:border-[#0A4B93] focus:shadow-[0_0_0_3px_rgba(10,75,147,.18)]";

export function NewsAdmin({ defaultAuthor }: { defaultAuthor: string }) {
  const [data, setData] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"list" | "edit">("list");
  const [edit, setEdit] = useState<EditModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListItem | null>(null);

  const [pickingDb, setPickingDb] = useState(false);
  const [chosenDb, setChosenDb] = useState("");
  const [savingDb, setSavingDb] = useState(false);

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/news");
      const d: ApiState = await res.json();
      setData(d);
      if (d.error && d.configured) setError(d.error);
      setChosenDb(d.contentDataSourceId ?? "");
    } catch {
      setError("Could not load News.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [load]);

  async function saveDb() {
    if (!chosenDb) return;
    setSavingDb(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/news/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId: chosenDb }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "Could not set the content database.");
      else {
        setPickingDb(false);
        await load();
      }
    } catch {
      setError("Could not set the content database.");
    }
    setSavingDb(false);
  }

  function startAdd() {
    setFormError(null);
    setEdit({
      NewsID: 0,
      categoryId: "",
      subjectId: "",
      fixtureId: "",
      Headline: "",
      ItemText: "",
      PublishDate: nowLocalInput(),
      UserID: defaultAuthor,
      NewCustomImage: "",
      TWPostText: "",
      FBPostText: "",
      Sticky: 0,
    });
    setMode("edit");
  }

  async function startEdit(id: number) {
    setFormError(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/news/${id}`);
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Could not load item.");
        return;
      }
      const it = d.item;
      setEdit({
        NewsID: it.NewsID,
        categoryId: it.CategoryID ? String(it.CategoryID) : "",
        subjectId: it.SubjectID ? String(it.SubjectID) : "",
        fixtureId: it.FixtureID ? String(it.FixtureID) : "",
        Headline: it.Headline ?? "",
        ItemText: decodeHtmlEntities(it.ItemText ?? ""),
        PublishDate: toLocalInput(it.PublishDate),
        UserID: it.UserID ?? defaultAuthor,
        NewCustomImage: it.NewCustomImage ?? "",
        TWPostText: it.TWPostText ?? "",
        FBPostText: it.FBPostText ?? "",
        Sticky: it.Sticky ?? 0,
      });
      setMode("edit");
    } catch {
      setError("Could not load item.");
    }
  }

  function patch(p: Partial<EditModel>) {
    setEdit((e) => (e ? { ...e, ...p } : e));
  }

  async function save() {
    if (!edit) return;
    if (!edit.categoryId) {
      setFormError("Please choose a category.");
      return;
    }
    if (!edit.Headline.trim()) {
      setFormError("Please enter a headline.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const body = {
      CategoryID: Number(edit.categoryId),
      SubjectID: edit.subjectId ? Number(edit.subjectId) : null,
      FixtureID: edit.fixtureId ? Number(edit.fixtureId) : null,
      Headline: edit.Headline,
      ItemText: edit.ItemText,
      PublishDate: edit.PublishDate,
      UserID: edit.UserID,
      NewCustomImage: edit.NewCustomImage,
      TWPostText: edit.TWPostText,
      FBPostText: edit.FBPostText,
      Sticky: edit.Sticky ? true : false,
    };
    try {
      const url = edit.NewsID === 0 ? "/api/admin/news" : `/api/admin/news/${edit.NewsID}`;
      const res = await fetch(url, {
        method: edit.NewsID === 0 ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(d.error ?? "Save failed.");
      } else {
        setMode("list");
        setEdit(null);
        await load();
      }
    } catch {
      setFormError("Save failed.");
    }
    setSaving(false);
  }

  async function doDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/news/${deleteTarget.NewsID}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Delete failed.");
      } else {
        setMode("list");
        setEdit(null);
        await load();
      }
    } catch {
      setError("Delete failed.");
    }
    setDeleteTarget(null);
  }

  const categories = data?.categories ?? [];
  const staff = data?.staff ?? [];
  const fixtures = data?.fixtures ?? [];
  const currentDb = data?.dataSources.find((s) => s.id === data.contentDataSourceId);

  // Derive unique categories for filter pills
  const list = data?.list ?? [];
  const catNames = ["All", ...Array.from(new Set(list.map((n) => n.CategoryShortName).filter(Boolean) as string[]))];

  const filteredList = list.filter((n) => {
    const matchCat = activeCat === "All" || n.CategoryShortName === activeCat;
    const matchSearch = !search || (n.Headline ?? "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (mode === "edit" && edit) {
    return (
      <EditForm
        edit={edit}
        patch={patch}
        categories={categories}
        staff={staff}
        fixtures={fixtures}
        saving={saving}
        formError={formError}
        onSave={save}
        onCancel={() => {
          setMode("list");
          setEdit(null);
        }}
        onDelete={edit.NewsID !== 0 ? () => setDeleteTarget(edit ? list.find(n => n.NewsID === edit.NewsID) ?? null : null) : undefined}
        deleteTarget={deleteTarget}
        onConfirmDelete={doDelete}
        onCancelDelete={() => setDeleteTarget(null)}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-[22px] flex flex-wrap items-end justify-between" style={{ gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 600, letterSpacing: "-0.025em", color: "#101828", margin: 0 }}>
            News
          </h1>
          {data?.configured && currentDb && (
            <p style={{ fontSize: 14, color: "#667085", marginTop: 6 }}>
              {list.length} articles · reading{" "}
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13, color: "#344054" }}>
                {currentDb.database}
              </span>{" "}
              ·{" "}
              <button
                type="button"
                onClick={() => { setChosenDb(data.contentDataSourceId ?? ""); setPickingDb(true); }}
                style={{ color: "#0A4B93", background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 0 }}
                className="hover:underline"
              >
                change database
              </button>
            </p>
          )}
        </div>
        {data?.configured && (
          <button
            type="button"
            onClick={startAdd}
            style={{
              height: 38,
              padding: "0 16px",
              background: "#0A4B93",
              color: "#fff",
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
            className="hover:bg-[#073A75]"
          >
            <Plus size={15} /> Write an article
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-[9px] px-3 py-2 text-sm" style={{ background: "#FEF3F2", color: "#B42318" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid h-40 place-items-center" style={{ color: "#98A2B3" }}>
          <Loader2 className="animate-spin" />
        </div>
      ) : !data?.configured || pickingDb ? (
        <ContentDbPicker
          dataSources={data?.dataSources ?? []}
          value={chosenDb}
          onChange={setChosenDb}
          onSave={saveDb}
          onCancel={data?.configured ? () => setPickingDb(false) : undefined}
          saving={savingDb}
          reason={data?.error}
        />
      ) : (
        <>
          {/* Filter row */}
          <div className="mb-[14px] flex flex-wrap items-center" style={{ gap: 10 }}>
            <div className="relative flex items-center">
              <Search size={14} className="pointer-events-none absolute left-3" style={{ color: "#98A2B3" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search headlines"
                style={{
                  height: 38,
                  width: 280,
                  padding: "0 12px 0 32px",
                  border: "1px solid #E4E7EC",
                  borderRadius: 9,
                  fontSize: 14,
                  background: "#fff",
                  outline: "none",
                }}
                className="focus:border-[#0A4B93]"
              />
            </div>
            {/* Category pills */}
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {catNames.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCat(cat)}
                  style={{
                    height: 32,
                    padding: "0 13px",
                    borderRadius: 99,
                    fontSize: 13,
                    fontWeight: 500,
                    border: `1px solid ${activeCat === cat ? "#0A4B93" : "#E4E7EC"}`,
                    background: activeCat === cat ? "#EEF4FB" : "#fff",
                    color: activeCat === cat ? "#0A4B93" : "#475467",
                    cursor: "pointer",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* News rows */}
          <NewsList
            list={filteredList}
            onEdit={startEdit}
            onDelete={(n) => setDeleteTarget(n)}
          />
        </>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(16,24,40,.45)" }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5"
            style={{ boxShadow: "0 24px 60px rgba(16,24,40,.28)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#101828" }}>Delete article</h2>
            <p style={{ marginTop: 8, fontSize: 14, color: "#475467" }}>
              Delete <strong>{deleteTarget.Headline}</strong>? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end" style={{ gap: 8 }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{
                  height: 36,
                  padding: "0 14px",
                  border: "1px solid #D0D5DD",
                  borderRadius: 9,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "#344054",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doDelete}
                style={{
                  height: 36,
                  padding: "0 14px",
                  border: "1px solid #FDA29B",
                  borderRadius: 9,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#B42318",
                  background: "#fff",
                  cursor: "pointer",
                }}
                className="hover:bg-[#FEF3F2]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentDbPicker({
  dataSources,
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  reason,
}: {
  dataSources: DataSource[];
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel?: () => void;
  saving: boolean;
  reason?: string;
}) {
  return (
    <div style={{ maxWidth: 560, background: "#fff", border: "1px solid #E4E7EC", borderRadius: 12, padding: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#101828" }}>Select the content database</h2>
      <p style={{ marginTop: 6, fontSize: 14, color: "#475467" }}>
        News reads and writes the <code>news_items</code>, <code>news_categories</code>,{" "}
        <code>staff</code> and <code>fixtures</code> tables in the qosfc content database.
      </p>
      {reason && <p style={{ marginTop: 8, fontSize: 12, color: "#B54708" }}>{reason}</p>}

      {dataSources.length === 0 ? (
        <div style={{ marginTop: 16, padding: "10px 12px", background: "#FFFAEB", border: "1px solid #FEDF89", borderRadius: 9, fontSize: 13.5, color: "#B54708" }}>
          No data sources yet.{" "}
          <Link href="/data-sources" style={{ color: "#0A4B93", fontWeight: 600 }}>
            Add one
          </Link>{" "}
          that points at the content database, then come back here.
        </div>
      ) : (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
            style={{ height: 38 }}
          >
            <option value="">— Select a data source —</option>
            {dataSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.database} @ {s.host})
              </option>
            ))}
          </select>
          <div className="flex items-center" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={onSave}
              disabled={!value || saving}
              style={{
                height: 38,
                padding: "0 16px",
                background: "#0A4B93",
                color: "#fff",
                borderRadius: 9,
                fontSize: 13.5,
                fontWeight: 600,
                border: "none",
                cursor: !value || saving ? "not-allowed" : "pointer",
                opacity: !value ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Use this database
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  height: 38,
                  padding: "0 14px",
                  border: "1px solid #D0D5DD",
                  borderRadius: 9,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "#344054",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NewsList({
  list,
  onEdit,
  onDelete,
}: {
  list: ListItem[];
  onEdit: (id: number) => void;
  onDelete: (n: ListItem) => void;
}) {
  if (list.length === 0) {
    return (
      <div
        style={{
          padding: "48px 24px",
          background: "#fff",
          border: "1px solid #E4E7EC",
          borderRadius: 12,
          textAlign: "center",
          fontSize: 14,
          color: "#667085",
        }}
      >
        No articles match.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E4E7EC",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {list.map((n, i) => (
        <div
          key={n.NewsID}
          style={{
            display: "flex",
            gap: 16,
            padding: "13px 16px",
            borderBottom: i < list.length - 1 ? "1px solid #F2F4F7" : "none",
            cursor: "pointer",
            alignItems: "center",
          }}
          className="hover:bg-[#FAFBFC]"
          onClick={() => onEdit(n.NewsID)}
        >
          {/* Thumb with 3px left category-hue border */}
          <div style={{ flexShrink: 0 }}>
            {n.ImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayImage(n.ImageUrl)}
                alt=""
                style={{ width: 74, height: 50, borderRadius: 7, objectFit: "cover", display: "block", borderLeft: `3px solid ${categoryColor(n.CategoryShortName).text}` }}
              />
            ) : (
              <div style={{ width: 74, height: 50, borderRadius: 7, background: HATCH, borderLeft: `3px solid ${categoryColor(n.CategoryShortName).text}` }} />
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center" style={{ gap: 8 }}>
              {n.Sticky ? (
                <span
                  style={{
                    height: 19,
                    padding: "0 7px",
                    borderRadius: 5,
                    background: "#FFFAEB",
                    border: "1px solid #FEDF89",
                    color: "#B54708",
                    fontSize: 10.5,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  PINNED
                </span>
              ) : null}
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: "#101828",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {n.Headline}
              </span>
            </div>
            <div className="flex items-center" style={{ gap: 9, marginTop: 5 }}>
              {n.CategoryShortName && (() => {
                const hue = categoryColor(n.CategoryShortName);
                return (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: hue.bg,
                    color: hue.text,
                    border: `1px solid ${hue.border}`,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  {n.CategoryShortName}
                </span>
                );
              })()}
              <span style={{ fontSize: 12.5, color: "#98A2B3" }}>{fmtListDate(n.PublishDate)}</span>
              {n.UserID && (
                <>
                  <span style={{ color: "#98A2B3", fontSize: 12.5 }}>·</span>
                  <span style={{ fontSize: 12.5, color: "#98A2B3" }}>{n.UserID}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center" style={{ gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onEdit(n.NewsID)}
              style={{
                height: 30,
                padding: "0 11px",
                border: "1px solid #D0D5DD",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 500,
                color: "#344054",
                background: "#fff",
                cursor: "pointer",
              }}
              className="hover:bg-[#F9FAFB]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(n)}
              style={{
                width: 30,
                height: 30,
                display: "grid",
                placeItems: "center",
                border: "none",
                background: "transparent",
                color: "#98A2B3",
                cursor: "pointer",
                borderRadius: 8,
              }}
              className="hover:bg-[#F2F4F7]"
              title="More options"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EditForm({
  edit,
  patch,
  categories,
  staff,
  fixtures,
  saving,
  formError,
  onSave,
  onCancel,
  onDelete,
  deleteTarget,
  onConfirmDelete,
  onCancelDelete,
}: {
  edit: EditModel;
  patch: (p: Partial<EditModel>) => void;
  categories: Lookup[];
  staff: Lookup[];
  fixtures: Lookup[];
  saving: boolean;
  formError: string | null;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  deleteTarget: ListItem | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const [socialOpen, setSocialOpen] = useState(true);
  const isNew = edit.NewsID === 0;

  const selectedCatName = categories.find((c) => String(c.Id) === edit.categoryId)?.Text ?? null;
  const catHue = categoryColor(selectedCatName);

  const panelStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #E4E7EC",
    borderRadius: 12,
    padding: 16,
  };
  const panelHeading: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "#101828",
    marginBottom: 13,
  };
  const fieldLabel: React.CSSProperties = {
    fontSize: 12,
    color: "#667085",
    marginBottom: 5,
    display: "block",
  };
  const inputStyle: React.CSSProperties = {
    height: 38,
    width: "100%",
    padding: "0 11px",
    border: "1px solid #D0D5DD",
    borderRadius: 9,
    fontSize: 13.5,
    outline: "none",
    boxSizing: "border-box",
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
          <div className="flex items-center" style={{ gap: 12 }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                width: 32,
                height: 32,
                display: "grid",
                placeItems: "center",
                border: "1px solid #E4E7EC",
                borderRadius: 8,
                color: "#475467",
                background: "#fff",
                cursor: "pointer",
              }}
              className="hover:bg-[#F2F4F7]"
            >
              <ArrowLeft size={15} />
            </button>
            <div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em", color: "#101828" }}>
                  {isNew ? "New article" : "Edit article"}
                </span>
                {selectedCatName && (
                  <span
                    style={{
                      padding: "2px 9px",
                      borderRadius: 6,
                      background: catHue.bg,
                      border: `1px solid ${catHue.border}`,
                      color: catHue.text,
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    {selectedCatName}
                  </span>
                )}
              </div>
              {!isNew && edit.PublishDate && (
                <div style={{ fontSize: 12.5, color: "#98A2B3" }}>
                  Published {edit.PublishDate.replace("T", ", ")} · by {edit.UserID}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 8 }}>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                style={{
                  height: 36,
                  padding: "0 14px",
                  border: "1px solid #FDA29B",
                  borderRadius: 9,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "#B42318",
                  background: "#fff",
                  cursor: "pointer",
                }}
                className="hover:bg-[#FEF3F2]"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              style={{
                height: 36,
                padding: "0 14px",
                border: "1px solid #D0D5DD",
                borderRadius: 9,
                fontSize: 13.5,
                fontWeight: 500,
                color: "#344054",
                background: "#fff",
                cursor: "pointer",
              }}
              className="hover:bg-[#F9FAFB]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              style={{
                height: 36,
                padding: "0 18px",
                background: "#0A4B93",
                color: "#fff",
                borderRadius: 9,
                fontSize: 13.5,
                fontWeight: 600,
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              className="hover:bg-[#073A75]"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className="mx-auto flex"
        style={{ maxWidth: 1400, padding: "24px 28px 64px", gap: 20, alignItems: "flex-start" }}
      >
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Headline card — 3px category-hue top border */}
          <div style={{ ...panelStyle, borderTop: `3px solid ${catHue.text}`, paddingTop: 14 }}>
            <label style={{ ...fieldLabel, color: catHue.text }}>Headline</label>
            <input
              value={edit.Headline}
              onChange={(e) => patch({ Headline: e.target.value })}
              placeholder="Enter headline…"
              style={{
                width: "100%",
                border: "1px solid #E4E7EC",
                borderRadius: 10,
                padding: "13px 14px",
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                outline: "none",
                boxSizing: "border-box",
              }}
              className="focus:border-[#0A4B93]"
            />
          </div>

          {/* Body editor card */}
          <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "4px 6px", background: "#FAFBFC", borderBottom: "1px solid #E4E7EC" }}>
              <Field label="">
                <RichText
                  value={edit.ItemText}
                  onChange={(html) => patch({ ItemText: html })}
                  height={480}
                />
              </Field>
            </div>
          </div>

          {formError && (
            <div style={{ padding: "10px 12px", background: "#FEF3F2", border: "1px solid #FDA29B", borderRadius: 9, fontSize: 13.5, color: "#B42318" }}>
              {formError}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ width: 332, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Publishing */}
          <div style={panelStyle}>
            <div style={{ ...panelHeading, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#0A4B93", flexShrink: 0, display: "inline-block" }} />
              Publishing
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={fieldLabel}>Goes live</label>
                <input
                  type="datetime-local"
                  value={edit.PublishDate}
                  onChange={(e) => patch({ PublishDate: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                />
              </div>
              <div>
                <label style={fieldLabel}>Author</label>
                <input
                  value={edit.UserID}
                  onChange={(e) => patch({ UserID: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                />
              </div>
              {/* Pin toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "#F9FAFB",
                  border: "1px solid #E4E7EC",
                  borderRadius: 9,
                  cursor: "pointer",
                }}
                onClick={() => patch({ Sticky: edit.Sticky ? 0 : 1 })}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "#344054" }}>Pin to the top</div>
                  <div style={{ fontSize: 12, color: "#98A2B3" }}>Stays first in news widgets</div>
                </div>
                <Toggle on={!!edit.Sticky} />
              </div>
            </div>
          </div>

          {/* Lead image */}
          <div style={panelStyle}>
            <div style={{ ...panelHeading, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#0E7090", flexShrink: 0, display: "inline-block" }} />
              Lead image
            </div>
            <ImageField
              label=""
              value={edit.NewCustomImage}
              onChange={(v) => patch({ NewCustomImage: v })}
            />
          </div>

          {/* Filing */}
          <div style={panelStyle}>
            <div style={{ ...panelHeading, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#5925DC", flexShrink: 0, display: "inline-block" }} />
              Filing
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={fieldLabel}>
                  Category <span style={{ color: "#B42318" }}>*</span>
                </label>
                <select
                  value={edit.categoryId}
                  onChange={(e) => patch({ categoryId: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                >
                  <option value="">— Select —</option>
                  {categories.map((c) => (
                    <option key={c.Id} value={c.Id}>{c.Text}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>
                  Player or staff{" "}
                  <span style={{ color: "#98A2B3", fontSize: 11 }}>— optional</span>
                </label>
                <select
                  value={edit.subjectId}
                  onChange={(e) => patch({ subjectId: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                >
                  <option value="">— none —</option>
                  {staff.map((s) => (
                    <option key={s.Id} value={s.Id}>{s.Text}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>
                  Fixture{" "}
                  <span style={{ color: "#98A2B3", fontSize: 11 }}>— optional</span>
                </label>
                <select
                  value={edit.fixtureId}
                  onChange={(e) => patch({ fixtureId: e.target.value })}
                  style={inputStyle}
                  className="focus:border-[#0A4B93]"
                >
                  <option value="">— none —</option>
                  {fixtures.map((f) => (
                    <option key={f.Id} value={f.Id}>{f.Text}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Social text */}
          <div style={panelStyle}>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setSocialOpen((v) => !v)}
              style={{ marginBottom: socialOpen ? 13 : 0 }}
            >
              <div className="flex items-center" style={{ gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#C4320A", flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#101828" }}>Social text</span>
                <span
                  style={{
                    padding: "1px 6px",
                    border: "1px solid #E4E7EC",
                    borderRadius: 5,
                    background: "#F9FAFB",
                    fontSize: 10.5,
                    color: "#667085",
                  }}
                >
                  saved, not posted
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#667085" }}>{socialOpen ? "▴" : "▾"}</span>
            </div>
            {socialOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={fieldLabel}>Post text</label>
                  <TextField
                    label=""
                    value={edit.TWPostText}
                    onChange={(v) => patch({ TWPostText: v })}
                    textarea
                  />
                </div>
                <div>
                  <label style={fieldLabel}>Facebook post</label>
                  <TextField
                    label=""
                    value={edit.FBPostText}
                    onChange={(v) => patch({ FBPostText: v })}
                    textarea
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(16,24,40,.45)" }}
          onClick={onCancelDelete}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5"
            style={{ boxShadow: "0 24px 60px rgba(16,24,40,.28)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#101828" }}>Delete article</h2>
            <p style={{ marginTop: 8, fontSize: 14, color: "#475467" }}>
              Delete <strong>{deleteTarget.Headline}</strong>? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end" style={{ gap: 8 }}>
              <button
                type="button"
                onClick={onCancelDelete}
                style={{
                  height: 36, padding: "0 14px", border: "1px solid #D0D5DD", borderRadius: 9,
                  fontSize: 13.5, fontWeight: 500, color: "#344054", background: "#fff", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                style={{
                  height: 36, padding: "0 14px", border: "1px solid #FDA29B", borderRadius: 9,
                  fontSize: 13.5, fontWeight: 600, color: "#B42318", background: "#fff", cursor: "pointer",
                }}
                className="hover:bg-[#FEF3F2]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      style={{
        width: 38,
        height: 22,
        borderRadius: 99,
        background: on ? "#0A4B93" : "#D0D5DD",
        transition: "background .15s",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          transition: "left .15s",
          boxShadow: "0 1px 2px rgba(16,24,40,.2)",
        }}
      />
    </div>
  );
}
