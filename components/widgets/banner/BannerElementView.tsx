"use client";

import type { CSSProperties } from "react";
import type { BannerElement } from "@/lib/widgets/registry";

// Background fields shared by banner settings and slider slides.
type BackgroundLike = {
  bgColor: string;
  bgImage: string;
  bgFit: "cover" | "contain" | "tile";
  bgTileSize: number;
  bgPosX?: number;
  bgPosY?: number;
};

function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return `rgba(0,0,0,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function bannerBackgroundStyle(s: BackgroundLike): CSSProperties {
  if (!s.bgImage) return { backgroundColor: s.bgColor };
  const posX = s.bgPosX ?? 50;
  const posY = s.bgPosY ?? 50;
  const base: CSSProperties = {
    backgroundColor: s.bgColor,
    backgroundImage: `url(${s.bgImage})`,
    backgroundPosition: `${posX}% ${posY}%`,
  };
  if (s.bgFit === "tile") {
    return {
      ...base,
      backgroundRepeat: "repeat",
      backgroundSize: s.bgTileSize > 0 ? `${s.bgTileSize}px` : "auto",
    };
  }
  return {
    ...base,
    backgroundRepeat: "no-repeat",
    backgroundSize: s.bgFit === "contain" ? "contain" : "cover",
  };
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
          background: el.bgOpacity > 0 ? hexToRgba(el.bgColor, el.bgOpacity) : "transparent",
          borderRadius: el.rounded ?? 0,
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
          opacity: el.opacity ?? 1,
          display: "block",
        }}
      />
    ) : (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#e2e8f0",
          borderRadius: el.rounded,
          opacity: el.opacity ?? 1,
        }}
      />
    );
  }

  if (el.type === "shape") {
    const base: CSSProperties = {
      width: "100%",
      height: "100%",
      background: hexToRgba(el.bgColor, el.bgOpacity),
    };
    if (el.shape === "ellipse") return <div style={{ ...base, borderRadius: "50%" }} />;
    if (el.shape === "triangle")
      return <div style={{ ...base, clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }} />;
    if (el.shape === "diamond")
      return <div style={{ ...base, clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />;
    return <div style={{ ...base, borderRadius: el.rounded }} />; // rectangle
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
