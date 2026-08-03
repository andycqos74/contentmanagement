"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSettings, HeroSlide } from "@/lib/widgets/registry";
import { ensureFontLoaded, fontStack } from "@/lib/widgets/fonts";

export function HeroSlider({
  settings,
  items,
}: {
  settings: HeroSettings;
  items: HeroSlide[];
}) {
  const count = items.length;
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => ensureFontLoaded(settings.fontFamily), [settings.fontFamily]);

  const go = useCallback(
    (i: number) => setIndex(count ? ((i % count) + count) % count : 0),
    [count],
  );

  useEffect(() => {
    if (!settings.autoplay || count <= 1) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % count),
      settings.intervalMs,
    );
    return () => clearInterval(t);
  }, [settings.autoplay, settings.intervalMs, count]);

  // Derive a safe current index instead of clamping via an effect.
  const current = count > 0 ? ((index % count) + count) % count : 0;

  if (count === 0) {
    return (
      <div
        className="flex items-center justify-center bg-slate-100 text-sm text-slate-400"
        style={{ height: settings.height, borderRadius: settings.rounded }}
      >
        No slides yet
      </div>
    );
  }

  const justify =
    settings.textPosition === "left"
      ? "flex-start"
      : settings.textPosition === "right"
        ? "flex-end"
        : "center";

  return (
    <div
      className="relative w-full select-none overflow-hidden"
      style={{
        height: settings.height,
        borderRadius: settings.rounded,
        maxWidth: settings.fullWidth ? "100%" : 1200,
        margin: settings.fullWidth ? undefined : "0 auto",
        fontFamily: fontStack(settings.fontFamily),
      }}
      role="region"
      aria-roledescription="carousel"
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
        startX.current = null;
      }}
    >
      {items.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0"
          aria-hidden={i !== current}
          style={
            settings.transition === "fade"
              ? {
                  opacity: i === current ? 1 : 0,
                  transition: "opacity 700ms ease",
                  zIndex: i === current ? 1 : 0,
                }
              : {
                  transform: `translateX(${(i - current) * 100}%)`,
                  transition: "transform 600ms ease",
                }
          }
        >
          {s.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.imageUrl}
              alt={s.heading || ""}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: settings.accentColor }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{ background: `rgba(0,0,0,${settings.overlayOpacity})` }}
          />
          <div
            className="relative flex h-full w-full flex-col p-8 md:p-12"
            style={{ justifyContent: "center", alignItems: justify }}
          >
            <div
              className="max-w-2xl"
              style={{ color: s.textColor || "#ffffff", textAlign: settings.textPosition }}
            >
              {s.heading && (
                <h2 className="text-3xl font-bold drop-shadow md:text-5xl">
                  {s.heading}
                </h2>
              )}
              {s.subheading && (
                <p className="mt-3 text-base opacity-95 drop-shadow md:text-xl">
                  {s.subheading}
                </p>
              )}
              {s.buttonText && (
                <a
                  href={s.buttonUrl || "#"}
                  className="mt-6 inline-block rounded-md px-6 py-3 font-semibold text-white shadow"
                  style={{ background: settings.accentColor }}
                >
                  {s.buttonText}
                </a>
              )}
            </div>
          </div>
        </div>
      ))}

      {settings.showArrows && count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(current - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {settings.showDots && count > 1 && (
        <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="h-2.5 rounded-full transition-all"
              style={{
                width: i === current ? 22 : 10,
                background: i === current ? "#fff" : "rgba(255,255,255,0.6)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
