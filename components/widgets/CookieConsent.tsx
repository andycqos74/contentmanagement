"use client";

import { type CSSProperties, useEffect, useState } from "react";
import type { CookieConsentSettings } from "@/lib/widgets/registry";
import { ensureFontLoaded, fontStack } from "@/lib/widgets/fonts";

// Non-fixed preview of the consent bar for the editor. The live embed is rendered
// by public/consent.js (fixed, in the host page, with localStorage + signalling).
export function CookieConsent({ settings: s }: { settings: CookieConsentSettings }) {
  const [showPrefs, setShowPrefs] = useState(false);
  const isBar = s.layout === "bar";

  useEffect(() => ensureFontLoaded(s.fontFamily), [s.fontFamily]);

  const btn = (bg: string, color: string, border?: string): CSSProperties => ({
    background: bg,
    color,
    border: border ?? "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  });

  return (
    <div
      style={{
        background: s.bgColor,
        color: s.textColor,
        borderRadius: s.rounded,
        boxShadow: "0 6px 30px rgba(0,0,0,0.18)",
        padding: "18px 20px",
        maxWidth: isBar ? "100%" : 420,
        margin: isBar ? undefined : "0 auto",
        fontFamily: fontStack(s.fontFamily),
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 20,
          flexDirection: isBar ? "row" : "column",
          alignItems: isBar ? "center" : "stretch",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          {s.title && <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 5 }}>{s.title}</div>}
          <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>
            {s.message}{" "}
            {s.policyUrl && (
              <a href={s.policyUrl} style={{ color: s.accentColor, textDecoration: "underline" }}>
                {s.policyText}
              </a>
            )}
          </div>
        </div>
        {!showPrefs && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {s.showCustomize && (
              <button
                type="button"
                style={btn("transparent", s.textColor, "1px solid rgba(100,116,139,.4)")}
                onClick={() => setShowPrefs(true)}
              >
                {s.customizeText}
              </button>
            )}
            {s.showReject && (
              <button type="button" style={btn("#64748b", "#fff")}>
                {s.rejectText}
              </button>
            )}
            <button type="button" style={btn(s.accentColor, s.buttonTextColor)}>
              {s.acceptText}
            </button>
          </div>
        )}
      </div>

      {showPrefs && (
        <div style={{ marginTop: 14 }}>
          {s.categories.map((c) => (
            <label
              key={c.key}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "10px 0",
                borderTop: "1px solid rgba(100,116,139,.2)",
              }}
            >
              <input type="checkbox" defaultChecked={c.required} disabled={c.required} style={{ marginTop: 3 }} />
              <span>
                <span style={{ fontWeight: 600, fontSize: 14, display: "block" }}>
                  {c.label}
                  {c.required ? " (always on)" : ""}
                </span>
                {c.description && (
                  <span style={{ fontSize: 13, opacity: 0.7, display: "block", marginTop: 2 }}>
                    {c.description}
                  </span>
                )}
              </span>
            </label>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button
              type="button"
              style={btn(s.accentColor, s.buttonTextColor)}
              onClick={() => setShowPrefs(false)}
            >
              {s.saveText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
