"use client";

import { type CSSProperties, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryItem, GallerySettings } from "@/lib/widgets/registry";

const ASPECT: Record<string, string | undefined> = {
  auto: undefined,
  square: "1 / 1",
  "4/3": "4 / 3",
  "3/4": "3 / 4",
  "16/9": "16 / 9",
};

export function Gallery({ settings, items }: { settings: GallerySettings; items: GalleryItem[] }) {
  const list = (settings.limit > 0 ? items.slice(0, settings.limit) : items).filter(
    (i) => i.imageUrl,
  );
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const go = useCallback(
    (d: number) => setIndex((i) => (i === null ? i : (i + d + list.length) % list.length)),
    [list.length],
  );

  // While the lightbox is open, ask the embed loader to expand the iframe to the
  // full viewport so the overlay covers the host page, not just the iframe box.
  useEffect(() => {
    const active = index !== null;
    if (!active) return; // only signal on open; close is handled on cleanup
    try {
      window.parent?.postMessage({ type: "cms-widget-overlay", active: true }, "*");
    } catch {}
    return () => {
      try {
        window.parent?.postMessage({ type: "cms-widget-overlay", active: false }, "*");
      } catch {}
    };
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, go]);

  if (list.length === 0) {
    return (
      <div className="grid h-40 place-items-center text-sm text-slate-400">No images yet</div>
    );
  }

  const minTile = Math.min(340, Math.max(90, Math.round(760 / settings.columns)));
  const containerStyle: CSSProperties =
    settings.layout === "masonry"
      ? { columnWidth: `${minTile}px`, columnGap: settings.gap }
      : {
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minTile}px), 1fr))`,
          gap: settings.gap,
        };
  const aspect = settings.layout === "grid" ? ASPECT[settings.aspect] : undefined;
  const clickable = settings.lightbox;

  return (
    <div>
      <div style={containerStyle}>
        {list.map((item, i) => {
          const inner = (
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: aspect,
                overflow: "hidden",
                borderRadius: settings.rounded,
                background: "#e2e8f0",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.caption || ""}
                loading="lazy"
                style={{
                  width: "100%",
                  height: aspect ? "100%" : "auto",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {settings.showCaptions && item.caption && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: "14px 12px 8px",
                    fontSize: 13,
                    lineHeight: 1.3,
                    color: "#fff",
                    background: "linear-gradient(transparent, rgba(0,0,0,0.65))",
                  }}
                >
                  {item.caption}
                </div>
              )}
            </div>
          );
          const wrap: CSSProperties =
            settings.layout === "masonry"
              ? { breakInside: "avoid", marginBottom: settings.gap }
              : {};

          if (item.link) {
            return (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...wrap, display: "block" }}
              >
                {inner}
              </a>
            );
          }
          if (clickable) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                style={{
                  ...wrap,
                  display: "block",
                  width: "100%",
                  padding: 0,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                {inner}
              </button>
            );
          }
          return (
            <div key={i} style={wrap}>
              {inner}
            </div>
          );
        })}
      </div>

      {index !== null && (
        <Lightbox
          item={list[index]}
          count={list.length}
          onClose={close}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
        />
      )}
    </div>
  );
}

const iconBtn: CSSProperties = {
  position: "absolute",
  display: "grid",
  placeItems: "center",
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};

function Lightbox({
  item,
  count,
  onClose,
  onPrev,
  onNext,
}: {
  item: GalleryItem;
  count: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <button type="button" aria-label="Close" onClick={stop(onClose)} style={{ ...iconBtn, top: 16, right: 16 }}>
        <X size={22} />
      </button>
      {count > 1 && (
        <>
          <button type="button" aria-label="Previous" onClick={stop(onPrev)} style={{ ...iconBtn, top: "50%", left: 16, transform: "translateY(-50%)" }}>
            <ChevronLeft size={24} />
          </button>
          <button type="button" aria-label="Next" onClick={stop(onNext)} style={{ ...iconBtn, top: "50%", right: 16, transform: "translateY(-50%)" }}>
            <ChevronRight size={24} />
          </button>
        </>
      )}
      <figure
        onClick={(e) => e.stopPropagation()}
        style={{ margin: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.caption || ""}
          style={{
            maxWidth: "92vw",
            maxHeight: item.caption ? "80vh" : "88vh",
            objectFit: "contain",
            borderRadius: 6,
          }}
        />
        {item.caption && <figcaption style={{ color: "#fff", fontSize: 14 }}>{item.caption}</figcaption>}
      </figure>
    </div>
  );
}
