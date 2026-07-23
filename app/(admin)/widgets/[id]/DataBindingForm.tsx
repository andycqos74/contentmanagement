"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Field, NumberField } from "@/components/admin/fields";
import {
  FILTER_OPS,
  type DataBinding,
  type DataField,
} from "@/lib/widgets/registry";

const selCls =
  "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-[#094582]";

type Source = { id: string; name: string; database: string };

export function DataBindingForm({
  dataSources,
  dataFields,
  dataSourceId,
  setDataSourceId,
  binding,
  setBinding,
}: {
  dataSources: Source[];
  dataFields: DataField[];
  dataSourceId: string | null;
  setDataSourceId: (id: string | null) => void;
  binding: DataBinding;
  setBinding: (b: DataBinding) => void;
}) {
  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataSourceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale async data when the source is removed
      setTables([]);
      return;
    }
    let active = true;
    setError(null);
    fetch(`/api/admin/data-sources/${dataSourceId}/tables`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d.error) setError(d.error);
        else setTables(d.tables ?? []);
      })
      .catch(() => active && setError("Failed to load tables"));
    return () => {
      active = false;
    };
  }, [dataSourceId]);

  useEffect(() => {
    if (!dataSourceId || !binding.table) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale async data when the table is cleared
      setColumns([]);
      return;
    }
    let active = true;
    fetch(`/api/admin/data-sources/${dataSourceId}/tables?table=${encodeURIComponent(binding.table)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d.error) setError(d.error);
        else setColumns((d.columns ?? []).map((c: { name: string }) => c.name));
      })
      .catch(() => active && setError("Failed to load columns"));
    return () => {
      active = false;
    };
  }, [dataSourceId, binding.table]);

  if (dataSources.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No data sources yet.{" "}
        <Link href="/data-sources" className="font-medium text-[#094582] underline">
          Add a MySQL connection
        </Link>{" "}
        to drive this widget from your database.
      </div>
    );
  }

  const patch = (p: Partial<DataBinding>) => setBinding({ ...binding, ...p });

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Data source">
          <select
            className={selCls}
            value={dataSourceId ?? ""}
            onChange={(e) => {
              setDataSourceId(e.target.value || null);
              patch({ table: "", fieldMap: {}, filters: [], orderBy: null });
            }}
          >
            <option value="">Select…</option>
            {dataSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.database})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Table">
          <select
            className={selCls}
            value={binding.table}
            disabled={!dataSourceId}
            onChange={(e) => patch({ table: e.target.value, fieldMap: {} })}
          >
            <option value="">Select…</option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {binding.table && columns.length > 0 && (
        <>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Map columns to widget fields
            </p>
            <div className="grid grid-cols-2 gap-3">
              {dataFields.map((f) => (
                <Field key={f.key} label={`${f.label}${f.required ? " *" : ""}`}>
                  <select
                    className={selCls}
                    value={binding.fieldMap[f.key] ?? ""}
                    onChange={(e) =>
                      patch({ fieldMap: { ...binding.fieldMap, [f.key]: e.target.value } })
                    }
                  >
                    <option value="">—</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Filters
            </p>
            <div className="space-y-2">
              {binding.filters.map((flt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className={selCls}
                    value={flt.column}
                    onChange={(e) => {
                      const filters = binding.filters.slice();
                      filters[i] = { ...flt, column: e.target.value };
                      patch({ filters });
                    }}
                  >
                    <option value="">column…</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    value={flt.op}
                    onChange={(e) => {
                      const filters = binding.filters.slice();
                      filters[i] = { ...flt, op: e.target.value as (typeof FILTER_OPS)[number] };
                      patch({ filters });
                    }}
                  >
                    {FILTER_OPS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                  <input
                    className={selCls}
                    value={flt.value}
                    placeholder="value"
                    onChange={(e) => {
                      const filters = binding.filters.slice();
                      filters[i] = { ...flt, value: e.target.value };
                      patch({ filters });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => patch({ filters: binding.filters.filter((_, idx) => idx !== i) })}
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patch({
                    filters: [...binding.filters, { column: columns[0] ?? "", op: "=", value: "" }],
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus size={13} /> Add filter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Order by">
              <select
                className={selCls}
                value={binding.orderBy?.column ?? ""}
                onChange={(e) =>
                  patch({
                    orderBy: e.target.value
                      ? { column: e.target.value, dir: binding.orderBy?.dir ?? "DESC" }
                      : null,
                  })
                }
              >
                <option value="">—</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Direction">
              <select
                className={selCls}
                value={binding.orderBy?.dir ?? "DESC"}
                disabled={!binding.orderBy}
                onChange={(e) =>
                  binding.orderBy &&
                  patch({ orderBy: { ...binding.orderBy, dir: e.target.value as "ASC" | "DESC" } })
                }
              >
                <option value="DESC">Descending</option>
                <option value="ASC">Ascending</option>
              </select>
            </Field>
            <NumberField
              label="Limit"
              min={1}
              max={100}
              value={binding.limit}
              onChange={(v) => patch({ limit: v })}
            />
          </div>
        </>
      )}
    </div>
  );
}
