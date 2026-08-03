"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import type { BannerElement, BannerSettings } from "@/lib/widgets/registry";
import { BannerElementView, bannerBackgroundStyle } from "./banner/BannerElementView";

// Renders the banner by scaling a fixed design canvas (width x height) to the
// container width, so absolutely-positioned elements stay in proportion.
export function Banner({
  settings,
  items,
}: {
  settings: BannerSettings;
  items: BannerElement[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const cw = Math.max(1, settings.width || 1);
  const ch = Math.max(1, settings.height || 1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / cw);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cw]);

  const s = scale ?? 1;
  const outer: CSSProperties =
    settings.widthMode === "fixed"
      ? { width: "100%", maxWidth: cw, margin: "0 auto" }
      : { width: "100%" };

  return (
    <div
      ref={ref}
      style={{
        ...outer,
        aspectRatio: `${cw} / ${ch}`,
        position: "relative",
        overflow: "hidden",
        borderRadius: settings.rounded,
        visibility: scale === null ? "hidden" : "visible",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: cw,
          height: ch,
          transform: `scale(${s})`,
          transformOrigin: "top left",
        }}
      >
        <div style={{ position: "absolute", inset: 0, ...bannerBackgroundStyle(settings) }} />
        {settings.overlayOpacity > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `rgba(0,0,0,${settings.overlayOpacity})`,
            }}
          />
        )}
        {items.map((el, i) => (
          <div
            key={el.id || i}
            style={{ position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h }}
          >
            <BannerElementView el={el} />
          </div>
        ))}
      </div>
    </div>
  );
}
