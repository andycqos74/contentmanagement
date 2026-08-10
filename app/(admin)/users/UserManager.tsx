"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Plus, Trash2, UserRound } from "lucide-react";

type U = { id: string; email: string; name: string | null; createdAt: string };

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#094582] focus:ring-1 focus:ring-[#094582]";
const empty = { name: "", email: "", password: "" };

export function UserManager({ initial, currentUserId }: { initial: U[]; currentUserId: string }) {
  const router = useRouter();
  const [users, setUsers] = useState<U[]>(initial);
  const [open, setOpen] = useState(initial.length <= 1);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upd = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  async function add() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      setUsers([...users, d.user]);
      setForm({ ...empty });
      setOpen(false);
      router.refresh();
    } else {
      setError(d.error ?? "Failed to add the user");
    }
  }

  async function del(u: U) {
    if (!confirm(`Remove ${u.email}? They won't be able to sign in. Widgets they created stay.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(users.filter((x) => x.id !== u.id));
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Couldn't remove the user");
    }
  }

  async function resetPassword(u: U) {
    const password = window.prompt(`New password for ${u.email} (at least 8 characters):`);
    if (!password) return;
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) alert("Password updated.");
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Couldn't update the password");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">
            Everyone here shares the same widgets, data sources and CDN connection.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-[#094582] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3f70]"
          >
            <Plus size={16} /> Add user
          </button>
        )}
      </div>

      <div className="mb-6 space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500">
                <UserRound size={18} />
              </span>
              <div>
                <p className="font-medium text-slate-900">
                  {u.name || u.email}
                  {u.id === currentUserId && (
                    <span className="ml-2 rounded-full bg-[#094582]/10 px-2 py-0.5 text-[11px] font-medium text-[#094582]">
                      You
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => resetPassword(u)}
                title="Reset password"
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <KeyRound size={16} />
              </button>
              <button
                type="button"
                onClick={() => del(u)}
                disabled={u.id === currentUserId}
                title={u.id === currentUserId ? "You can't remove yourself" : "Remove user"}
                className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-900">New user</h2>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Name (optional)</span>
              <input className={inputCls} value={form.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Jane Smith" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
              <input
                className={inputCls}
                type="email"
                value={form.email}
                onChange={(e) => upd({ email: e.target.value })}
                placeholder="jane@qosfc.com"
              />
            </label>
            <label className="col-span-2 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Password</span>
              <input
                className={inputCls}
                type="password"
                value={form.password}
                onChange={(e) => upd({ password: e.target.value })}
                placeholder="At least 8 characters"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={add}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[#094582] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3f70] disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              Add user
            </button>
            {users.length > 1 && (
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
