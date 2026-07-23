"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2, Plus, Trash2 } from "lucide-react";

type Source = {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#094582] focus:ring-1 focus:ring-[#094582]";

const empty = {
  name: "",
  host: "",
  port: "3306",
  database: "",
  username: "",
  password: "",
  ssl: false,
};

export function DataSourceManager({ initial }: { initial: Source[] }) {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>(initial);
  const [open, setOpen] = useState(initial.length === 0);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function upd(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function add() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/data-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, port: Number(form.port) }),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      setSources([d.source, ...sources]);
      setForm({ ...empty });
      setOpen(false);
      router.refresh();
    } else {
      setError(d.error ?? "Failed to add data source");
    }
  }

  async function del(id: string) {
    if (!confirm("Remove this data source? Widgets using it will stop loading data.")) return;
    await fetch(`/api/admin/data-sources/${id}`, { method: "DELETE" });
    setSources(sources.filter((s) => s.id !== id));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data sources</h1>
          <p className="text-sm text-slate-500">
            Read-only MySQL connections that drive data-bound widgets.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-[#094582] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3f70]"
          >
            <Plus size={16} /> Add connection
          </button>
        )}
      </div>

      {sources.length > 0 && (
        <div className="mb-6 space-y-2">
          {sources.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500">
                  <Database size={18} />
                </span>
                <div>
                  <p className="font-medium text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {s.username}@{s.host}:{s.port}/{s.database}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => del(s.id)}
                className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">New connection</h2>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <label className="col-span-2 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Name</span>
              <input className={inputCls} value={form.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Club website DB" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Host</span>
              <input className={inputCls} value={form.host} onChange={(e) => upd({ host: e.target.value })} placeholder="db.example.com" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Port</span>
              <input className={inputCls} value={form.port} onChange={(e) => upd({ port: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Database</span>
              <input className={inputCls} value={form.database} onChange={(e) => upd({ database: e.target.value })} placeholder="website" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Username</span>
              <input className={inputCls} value={form.username} onChange={(e) => upd({ username: e.target.value })} placeholder="readonly_user" />
            </label>
            <label className="col-span-2 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Password</span>
              <input type="password" className={inputCls} value={form.password} onChange={(e) => upd({ password: e.target.value })} />
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.ssl} onChange={(e) => upd({ ssl: e.target.checked })} />
              Use SSL
            </label>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Tip: create a MySQL user with <code className="rounded bg-slate-100 px-1">GRANT SELECT</code> only. The
            connection is verified before saving and the password is encrypted at rest.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={add}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[#094582] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3f70] disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              Test & save
            </button>
            {initial.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
