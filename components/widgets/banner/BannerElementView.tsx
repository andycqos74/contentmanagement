"use client";

import type { CSSProperties } from "react";
import type { BannerElement, BannerSettings } from "@/lib/widgets/registry";

export function bannerBackgroundStyle(s: BannerSettings): CSSProperties {
  if (s.bgImage) {
    return {
      backgroundColor: s.bgColor,
      backgroundImage: `url(${s.bgImage})`,
      backgroundSize: s.bgFit === "contain" ? "contain" : "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  return { backgroundColor: s.bgColor };
}

// Renders one banner element, filling its absolutely-positioned box.
export function BannerElementView({ el }: { el: BannerElement }) {
  if (el.type === "text") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent:
            el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center",
          color: el.color,
          fontSize: el.fontSize,
          fontWeight: Number(el.fontWeight),
          textAlign: el.align,
          background: el.bg,
          padding: 4,
          boxSizing: "border-box",
          overflow: "hidden",
          lineHeight: 1.2,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {el.text}
      </div>
    );
  }

  if (el.type === "image") {
    return el.imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={el.imageUrl}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: el.fit,
          borderRadius: el.rounded,
          display: "block",
        }}
      />
    ) : (
      <div
        style={{ width: "100%", height: "100%", background: "#e2e8f0", borderRadius: el.rounded }}
      />
    );
  }

  // button
  return (
    <a
      href={el.url || "#"}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: el.bg,
        color: el.color,
        fontSize: el.fontSize,
        borderRadius: el.rounded,
        textDecoration: "none",
        fontWeight: 600,
        padding: "0 8px",
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      {el.text}
    </a>
  );
}
