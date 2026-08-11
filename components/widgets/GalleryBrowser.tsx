"use client";

import { type CSSProperties, useState } from "react";
import { ChevronLeft, Images } from "lucide-react";
import {
  gallerySettingsSchema,
  type GalleryAlbum,
  type GalleryBrowserSettings,
} from "@/lib/widgets/registry";
import { fontStack } from "@/lib/widgets/fonts";
import { Gallery } from "./Gallery";

const ASPECT: Record<string, string | undefined> = {
  auto: undefined,
  square: "1 / 1",
  "4/3": "4 / 3",
  "3/4": "3 / 4",
  "16/9": "16 / 9",
};

// An album index: a grid of folder cover cards that open into that folder's
// gallery. Reuses the Gallery widget (lightbox and all) for the opened album.
export function GalleryBrowser({
  settings,
  items,
}: {
  settings: GalleryBrowserSettings;
  items: GalleryAlbum[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  const albums = items.filter((a) => a.images.length > 0);
  const root: CSSProperties = { fontFamily: fontStack(settings.fontFamily) };

  if (albums.length === 0) {
    return (
      <div style={{ ...root, display: "grid", placeItems: "center", height: 160, color: "#94a3b8", fontSize: 14 }}>
        No albums yet
      </div>
    );
  }

  // Opened album → the folder's images as a gallery, with a back link.
  if (open !== null && albums[open]) {
    const album = albums[open];
    const gallerySettings = gallerySettingsSchema.parse({
      source: "manual",
      layout: "grid",
      columns: settings.galleryColumns,
      gap: settings.galleryGap,
      rounded: settings.rounded,
      aspect: settings.galleryAspect,
      lightbox: settings.lightbox,
      showCaptions: settings.showCaptions,
      limit: 0,
    });
    return (
      <div style={root}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setOpen(null)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px 7px 8px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: settings.accentColor,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <ChevronLeft size={18} /> {settings.backLabel}
          </button>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: settings.titleColor }}>
            {album.title}
          </h3>
          {settings.showCount && (
            <span style={{ fontSize: 13, color: "#64748b" }}>{album.count} photos</span>
          )}
        </div>
        <Gallery settings={gallerySettings} items={album.images} />
      </div>
    );
  }

  // Album index — a responsive grid of cover cards.
  const minTile = Math.min(360, Math.max(120, Math.round(820 / settings.columns)));
  const aspect = ASPECT[settings.aspect] ?? "4 / 3";

  return (
    <div
      style={{
        ...root,
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minTile}px), 1fr))`,
        gap: settings.gap,
      }}
    >
      {albums.map((album, i) => (
        <button
          key={album.path || i}
          type="button"
          onClick={() => setOpen(i)}
          style={{
            display: "block",
            width: "100%",
            padding: 0,
            border: "none",
            background: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: aspect,
              overflow: "hidden",
              borderRadius: settings.rounded,
              background: "#e2e8f0",
              display: "grid",
              placeItems: "center",
            }}
          >
            {album.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={album.cover}
                alt={album.title}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <Images size={34} color="#94a3b8" />
            )}
            {settings.showCount && (
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "rgba(15,23,42,0.72)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Images size={13} /> {album.count}
              </span>
            )}
          </div>
          {settings.showTitles && (
            <div
              style={{
                marginTop: 8,
                fontSize: 15,
                fontWeight: 600,
                color: settings.titleColor,
                lineHeight: 1.3,
              }}
            >
              {album.title}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
