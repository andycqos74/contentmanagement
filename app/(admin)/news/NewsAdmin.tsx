"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
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

// Editable form model. Dropdown ids are kept as strings ("" = none) so the
// "— None —" option round-trips cleanly.
type EditModel = {
  NewsID: number;
  categoryId: string;
  subjectId: string;
  fixtureId: string;
  Headline: string;
  ItemText: string;
  PublishDate: string; // datetime-local value
  UserID: string;
  NewCustomImage: string;
  TWPostText: string;
  FBPostText: string;
  Sticky: number;
};

const PUBLIC_SITE = (
  process.env.NEXT_PUBLIC_CONTENT_SITE_URL || "https://www.qosfc.com"
).replace(/\/+$/, "");

// Resolve a stored image URL for preview in the admin. Absolute URLs and our own
// /api/media proxy URLs are used as-is; legacy "~/…" and root-relative "/images/…"
// paths live on the public site.
function displayImage(url: string | null): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return url;
  if (url.startsWith("~")) return PUBLIC_SITE + url.slice(1);
  if (url.startsWith("/")) return PUBLIC_SITE + url;
  return url;
}

// "YYYY-MM-DD HH:mm:ss" (from the DB) or ISO → datetime-local "YYYY-MM-DDTHH:mm".
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

const selectCls =
  "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-[#094582] focus:ring-1 focus:ring-[#094582]";

export function NewsAdmin({ defaultAuthor }: { defaultAuthor: string }) {
  const [data, setData] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"list" | "edit">("list");
  const [edit, setEdit] = useState<EditModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListItem | null>(null);

  // Content-DB selector state (shown when not configured, or via "change").
  const [pickingDb, setPickingDb] = useState(false);
  const [chosenDb, setChosenDb] = useState("");
  const [savingDb, setSavingDb] = useState(false);

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
        ItemText: it.ItemText ?? "",
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">News</h1>
          {data?.configured && currentDb && mode === "list" && (
            <p className="mt-1 text-xs text-slate-500">
              Content database: <span className="font-medium text-slate-700">{currentDb.name}</span>{" "}
              <span className="text-slate-400">
                ({currentDb.database} @ {currentDb.host})
              </span>{" "}
              ·{" "}
              <button
                type="button"
                onClick={() => {
                  setChosenDb(data.contentDataSourceId ?? "");
                  setPickingDb(true);
                }}
                className="text-[#094582] underline hover:no-underline"
              >
                change
              </button>
            </p>
          )}
        </div>
        {mode === "list" && data?.configured && (
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-2 rounded-md bg-[#094582] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3f70]"
          >
            <Plus size={16} /> Add news item
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid h-40 place-items-center text-slate-400">
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
      ) : mode === "list" ? (
        <NewsList
          list={data.list ?? []}
          onEdit={startEdit}
          onDelete={(n) => setDeleteTarget(n)}
        />
      ) : (
        edit && (
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
          />
        )
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">Delete news item</h2>
            <p className="mt-2 text-sm text-slate-600">
              Delete <strong>{deleteTarget.Headline}</strong>? This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doDelete}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
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
    <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">Select the content database</h2>
      <p className="mt-1 text-sm text-slate-600">
        News reads and writes the <code>news_items</code>, <code>news_categories</code>,{" "}
        <code>staff</code> and <code>fixtures</code> tables in the qosfc content database. Pick which
        configured data source that is.
      </p>
      {reason && <p className="mt-2 text-xs text-amber-600">{reason}</p>}

      {dataSources.length === 0 ? (
        <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No data sources yet.{" "}
          <Link href="/data-sources" className="font-medium underline">
            Add one
          </Link>{" "}
          that points at the content database, then come back here.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
            <option value="">— Select a data source —</option>
            {dataSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.database} @ {s.host})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={!value || saving}
              className="inline-flex items-center gap-2 rounded-md bg-[#094582] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3f70] disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />} Use this database
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
    return <p className="text-sm text-slate-500">No news items yet.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
          <tr>
            <th className="w-16 px-3 py-2"></th>
            <th className="px-3 py-2">Headline</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Published</th>
            <th className="px-3 py-2">Author</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {list.map((n) => (
            <tr key={n.NewsID} className="hover:bg-slate-50">
              <td className="px-3 py-2">
                {n.ImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayImage(n.ImageUrl)}
                    alt=""
                    className="h-12 w-12 rounded object-cover"
                  />
                )}
              </td>
              <td className="px-3 py-2 font-medium text-slate-800">{n.Headline}</td>
              <td className="px-3 py-2">
                {n.CategoryShortName && (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {n.CategoryShortName}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-slate-600">{fmtListDate(n.PublishDate)}</td>
              <td className="px-3 py-2 text-slate-600">{n.UserID}</td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(n.NewsID)}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(n)}
                  className="ml-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Details</h3>
            <div className="space-y-3">
              <Field label="Category *">
                <select
                  value={edit.categoryId}
                  onChange={(e) => patch({ categoryId: e.target.value })}
                  className={selectCls}
                >
                  <option value="">— Select —</option>
                  {categories.map((c) => (
                    <option key={c.Id} value={c.Id}>
                      {c.Text}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Subject (optional)">
                <select
                  value={edit.subjectId}
                  onChange={(e) => patch({ subjectId: e.target.value })}
                  className={selectCls}
                >
                  <option value="">— None —</option>
                  {staff.map((s) => (
                    <option key={s.Id} value={s.Id}>
                      {s.Text}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fixture (optional)">
                <select
                  value={edit.fixtureId}
                  onChange={(e) => patch({ fixtureId: e.target.value })}
                  className={selectCls}
                >
                  <option value="">— None —</option>
                  {fixtures.map((f) => (
                    <option key={f.Id} value={f.Id}>
                      {f.Text}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Publish on">
                <input
                  type="datetime-local"
                  value={edit.PublishDate}
                  onChange={(e) => patch({ PublishDate: e.target.value })}
                  className={selectCls}
                />
              </Field>
              <TextField
                label="Author"
                value={edit.UserID}
                onChange={(v) => patch({ UserID: v })}
              />
              <ImageField
                label="Image"
                value={edit.NewCustomImage}
                onChange={(v) => patch({ NewCustomImage: v })}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">
              Social text{" "}
              <span className="ml-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                stored, not auto-posted yet
              </span>
            </h3>
            <div className="mt-2 space-y-3">
              <TextField
                label="Tweet"
                value={edit.TWPostText}
                onChange={(v) => patch({ TWPostText: v })}
                textarea
              />
              <TextField
                label="Facebook post"
                value={edit.FBPostText}
                onChange={(v) => patch({ FBPostText: v })}
                textarea
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Article</h3>
            <div className="space-y-3">
              <TextField
                label="Headline *"
                value={edit.Headline}
                onChange={(v) => patch({ Headline: v })}
              />
              <Field label="Body">
                <RichText
                  value={edit.ItemText}
                  onChange={(html) => patch({ ItemText: html })}
                  height={480}
                />
              </Field>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-[#094582] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3f70] disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {edit.NewsID === 0 ? "Create news item" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        {formError && <span className="text-sm text-red-600">{formError}</span>}
      </div>
    </form>
  );
}
