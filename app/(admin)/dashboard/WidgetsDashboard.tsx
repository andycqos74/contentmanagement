"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  List,
  Loader2,
  Search,
  X,
} from "lucide-react";
import type { WidgetTypeKey } from "@/lib/widgets/registry";

type WidgetRow = {
  id: string;
  name: string;
  type: WidgetTypeKey;
  typeLabel: string;
  status: "PUBLISHED" | "DRAFT";
  contentSource: "MANUAL" | "DATA";
  updatedAt: string;
};

type WidgetTypeDef = {
  key: WidgetTypeKey;
  label: string;
  description: string;
};

const HATCH =
  "repeating-linear-gradient(135deg,#EDEFF3 0 8px,#F5F6F8 8px 16px)";

function fmt(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function StatusPill({ status }: { status: "PUBLISHED" | "DRAFT" }) {
  const pub = status === "PUBLISHED";
  return (
    <span
      style={{
        height: 22,
        padding: "0 9px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        background: pub ? "#ECFDF3" : "#FFFAEB",
        border: `1px solid ${pub ? "#ABEFC6" : "#FEDF89"}`,
        color: pub ? "#067647" : "#B54708",
      }}
    >
      {pub ? "Published" : "Draft"}
    </span>
  );
}

function NewWidgetModal({
  widgetTypes,
  onClose,
}: {
  widgetTypes: WidgetTypeDef[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<WidgetTypeKey>("LATEST_NEWS");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name: name.trim() }),
    });
    const d = await res.json();
    if (res.ok) {
      router.push(`/widgets/${d.widget.id}`);
    } else {
      setCreating(false);
      alert(d.error ?? "Failed to create widget");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: "rgba(16,24,40,.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full overflow-hidden bg-white"
        style={{
          maxWidth: 620,
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(16,24,40,.28)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between" style={{ padding: "20px 22px 0" }}>
          <div>
            <h2
              style={{
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#101828",
                margin: 0,
              }}
            >
              New widget
            </h2>
            <p style={{ fontSize: 13.5, color: "#667085", marginTop: 4 }}>
              Pick what it should do. You can change everything later.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {/* Type grid */}
        <div
          style={{
            padding: "18px 22px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          {widgetTypes.map((w) => {
            const selected = type === w.key;
            return (
              <button
                key={w.key}
                type="button"
                onClick={() => setType(w.key)}
                style={{
                  padding: 13,
                  borderRadius: 11,
                  textAlign: "left",
                  border: `1px solid ${selected ? "#0A4B93" : "#E4E7EC"}`,
                  background: selected ? "#EEF4FB" : "#fff",
                  boxShadow: selected ? "0 0 0 1px #0A4B93" : "none",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#101828" }}>
                  {w.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#667085",
                    marginTop: 3,
                    lineHeight: 1.45,
                  }}
                >
                  {w.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="flex items-end"
          style={{
            padding: "16px 22px 20px",
            borderTop: "1px solid #E4E7EC",
            gap: 12,
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Homepage news strip"
            onKeyDown={(e) => e.key === "Enter" && create()}
            style={{
              flex: 1,
              height: 40,
              padding: "0 12px",
              border: "1px solid #D0D5DD",
              borderRadius: 9,
              fontSize: 13.5,
              outline: "none",
            }}
            className="focus:border-[#0A4B93]"
          />
          <button
            type="button"
            onClick={create}
            disabled={creating || !name.trim()}
            style={{
              height: 40,
              padding: "0 20px",
              background: "#0A4B93",
              color: "#fff",
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: creating || !name.trim() ? "not-allowed" : "pointer",
              opacity: !name.trim() ? 0.5 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            className="hover:bg-[#073A75] disabled:hover:bg-[#0A4B93]"
          >
            {creating && <Loader2 size={14} className="animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export function WidgetsDashboard({
  widgets,
  widgetTypes,
}: {
  widgets: WidgetRow[];
  widgetTypes: WidgetTypeDef[];
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = widgets.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()),
  );
  const published = widgets.filter((w) => w.status === "PUBLISHED").length;
  const draft = widgets.length - published;

  return (
    <div>
      {/* Page header */}
      <div
        className="flex flex-wrap items-end justify-between"
        style={{ gap: 24, marginBottom: 24 }}
      >
        <div>
          <h1
            style={{
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "#101828",
              margin: 0,
            }}
          >
            Widgets
          </h1>
          <p style={{ fontSize: 14, color: "#667085", marginTop: 6 }}>
            {widgets.length} widget{widgets.length !== 1 ? "s" : ""} ·{" "}
            {published} live on the site · {draft} in draft
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center" style={{ gap: 10 }}>
          {/* Search */}
          <div className="relative flex items-center">
            <Search
              size={14}
              className="pointer-events-none absolute left-3"
              style={{ color: "#98A2B3" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search widgets"
              style={{
                height: 38,
                width: 240,
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

          {/* Grid/List toggle */}
          <div
            className="flex"
            style={{
              padding: 3,
              background: "#F2F4F7",
              borderRadius: 9,
              gap: 2,
            }}
          >
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  background: view === v ? "#fff" : "transparent",
                  color: view === v ? "#101828" : "#667085",
                  boxShadow:
                    view === v ? "0 1px 2px rgba(16,24,40,.10)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {v === "grid" ? <LayoutGrid size={13} /> : <List size={13} />}
                {v === "grid" ? "Grid" : "List"}
              </button>
            ))}
          </div>

          {/* New widget */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
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
            + New widget
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          className="flex flex-col items-center justify-center"
          style={{
            border: "1px dashed #D0D5DD",
            borderRadius: 12,
            padding: "48px 24px",
            background: "#fff",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#667085", fontSize: 14 }}>
            {search ? "No widgets match your search." : "No widgets yet."}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              style={{
                marginTop: 12,
                height: 36,
                padding: "0 16px",
                background: "#0A4B93",
                color: "#fff",
                borderRadius: 9,
                fontSize: 13.5,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Create your first widget
            </button>
          )}
        </div>
      )}

      {/* Grid view */}
      {filtered.length > 0 && view === "grid" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((w) => (
            <Link
              key={w.id}
              href={`/widgets/${w.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #E4E7EC",
                  borderRadius: 12,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "box-shadow .15s, border-color .15s",
                }}
                className="group hover:border-[#B9C6D8] hover:shadow-[0_6px_20px_rgba(16,24,40,.07)]"
              >
                {/* Thumb */}
                <div
                  className="relative flex items-center justify-center"
                  style={{
                    height: 132,
                    background: HATCH,
                    borderBottom: "1px solid #E4E7EC",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "#98A2B3",
                      letterSpacing: ".04em",
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    {w.typeLabel.toUpperCase()}
                  </span>
                  {/* Status pill */}
                  <div className="absolute left-2.5 top-2.5">
                    <StatusPill status={w.status} />
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: "14px 16px 16px" }}>
                  <div className="flex items-center justify-between">
                    <span
                      style={{
                        fontSize: 15.5,
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: "#101828",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {w.name}
                    </span>
                    <span style={{ color: "#98A2B3", fontSize: 14, marginLeft: 6 }}>
                      ···
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 10 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "#F2F4F7",
                        color: "#475467",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {w.typeLabel}
                    </span>
                    <span style={{ fontSize: 12.5, color: "#98A2B3" }}>
                      {w.contentSource === "DATA" ? "Database" : "Manual"} · updated {fmt(w.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* List view */}
      {filtered.length > 0 && view === "list" && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E4E7EC",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "64px 1fr 150px 130px 110px 40px",
              gap: 16,
              padding: "10px 16px",
              background: "#FAFBFC",
              borderBottom: "1px solid #E4E7EC",
              fontSize: 12,
              fontWeight: 600,
              color: "#667085",
            }}
          >
            <div />
            <div>Name</div>
            <div>Type</div>
            <div>Content</div>
            <div>Updated</div>
            <div />
          </div>

          {/* Rows */}
          {filtered.map((w) => (
            <Link key={w.id} href={`/widgets/${w.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "64px 1fr 150px 130px 110px 40px",
                  gap: 16,
                  padding: "12px 16px",
                  borderBottom: "1px solid #F2F4F7",
                  cursor: "pointer",
                  alignItems: "center",
                }}
                className="hover:bg-[#FAFBFC]"
              >
                {/* Thumb */}
                <div
                  style={{
                    height: 38,
                    borderRadius: 6,
                    background: HATCH,
                  }}
                />
                {/* Name + status */}
                <div className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 14.5,
                      fontWeight: 600,
                      color: "#101828",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {w.name}
                  </span>
                  <StatusPill status={w.status} />
                </div>
                <div style={{ fontSize: 13.5, color: "#475467" }}>{w.typeLabel}</div>
                <div style={{ fontSize: 13.5, color: "#475467" }}>
                  {w.contentSource === "DATA" ? "Database" : "Manual"}
                </div>
                <div style={{ fontSize: 13.5, color: "#98A2B3" }}>{fmt(w.updatedAt)}</div>
                <div style={{ fontSize: 16, color: "#98A2B3", textAlign: "center" }}>›</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <NewWidgetModal
          widgetTypes={widgetTypes}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
