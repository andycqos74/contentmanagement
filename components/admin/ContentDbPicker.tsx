"use client";

// Picker for the shared "content database" setting (the qosfc DB that News,
// Fixtures and other ported qos-admin pages read from and write to).
import type { ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export type DataSource = { id: string; name: string; host: string; database: string };

const inputCls =
  "w-full rounded-[9px] border border-[#D0D5DD] px-3 text-sm outline-none focus:border-[#0A4B93] focus:shadow-[0_0_0_3px_rgba(10,75,147,.18)]";

export function ContentDbPicker({
  dataSources,
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  reason,
  description,
}: {
  dataSources: DataSource[];
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel?: () => void;
  saving: boolean;
  reason?: string;
  description: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 560, background: "#fff", border: "1px solid #E4E7EC", borderRadius: 12, padding: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#101828" }}>Select the content database</h2>
      <p style={{ marginTop: 6, fontSize: 14, color: "#475467" }}>
        {description}
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
