import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { WIDGETS } from "@/lib/widgets/registry";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const published = status === "PUBLISHED";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
        published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

export default async function DashboardPage() {
  const widgets = await prisma.widget.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Widgets</h1>
          <p className="text-sm text-slate-500">
            Create embeddable widgets and paste them into any website.
          </p>
        </div>
        <Link
          href="/widgets/new"
          className="inline-flex items-center gap-2 rounded-md bg-[#094582] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3f70]"
        >
          <Plus size={16} /> New widget
        </Link>
      </div>

      {widgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-500">No widgets yet.</p>
          <Link
            href="/widgets/new"
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#094582] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0b3f70]"
          >
            <Plus size={16} /> Create your first widget
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {widgets.map((w) => (
            <Link
              key={w.id}
              href={`/widgets/${w.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#094582] hover:shadow"
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {WIDGETS[w.type].label}
                </span>
                <StatusBadge status={w.status} />
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{w.name}</h3>
              <p className="mt-1 text-xs text-slate-400">
                {w.contentSource === "DATA" ? "Data-driven" : "Manual"} · updated{" "}
                {new Date(w.updatedAt).toLocaleDateString("en-GB")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
