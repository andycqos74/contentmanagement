"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SliderSettings, SliderSlide } from "@/lib/widgets/registry";
import { BannerElementView, bannerBackgroundStyle } from "./banner/BannerElementView";

// One slide: background + freely-placed elements, scaled from the design canvas.
export function SlideStage({
  cw,
  ch,
  scale,
  slide,
}: {
  cw: number;
  ch: number;
  scale: number;
  slide: SliderSlide;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: cw,
          height: ch,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div style={{ position: "absolute", inset: 0, ...bannerBackgroundStyle(slide) }} />
        {slide.overlayOpacity > 0 && (
          <div
            style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${slide.overlayOpacity})` }}
          />
        )}
        {slide.elements.map((el, i) => (
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

export function Slider({ settings, items }: { settings: SliderSettings; items: SliderSlide[] }) {
  const count = items.length;
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const cw = settings.width;
  const ch = settings.height;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / cw);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cw]);

  const go = useCallback(
    (i: number) => setIndex(count ? ((i % count) + count) % count : 0),
    [count],
  );

  useEffect(() => {
    if (!settings.autoplay || count <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), settings.intervalMs);
    return () => clearInterval(t);
  }, [settings.autoplay, settings.intervalMs, count]);

  const s = scale ?? 1;
  const current = count ? ((index % count) + count) % count : 0;
  const outer: CSSProperties =
    settings.widthMode === "fixed"
      ? { width: "100%", maxWidth: cw, margin: "0 auto" }
      : { width: "100%" };

  if (count === 0) {
    return <div ref={ref} style={{ ...outer, aspectRatio: `${cw} / ${ch}`, background: "#e2e8f0" }} />;
  }

  return (
    <div
      ref={ref}
      className="select-none"
      style={{
        ...outer,
        aspectRatio: `${cw} / ${ch}`,
        position: "relative",
        overflow: "hidden",
        borderRadius: settings.rounded,
        visibility: scale === null ? "hidden" : "visible",
      }}
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
        startX.current = null;
      }}
    >
      {items.map((slide, i) => (
        <div
          key={i}
          aria-hidden={i !== current}
          style={
            settings.transition === "fade"
              ? {
                  position: "absolute",
                  inset: 0,
                  opacity: i === current ? 1 : 0,
                  transition: "opacity 600ms ease",
                  zIndex: i === current ? 1 : 0,
                }
              : {
                  position: "absolute",
                  inset: 0,
                  transform: `translateX(${(i - current) * 100}%)`,
                  transition: "transform 500ms ease",
                }
          }
        >
          <SlideStage cw={cw} ch={ch} scale={s} slide={slide} />
        </div>
      ))}

      {settings.showArrows && count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(current - 1)}
            className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(current + 1)}
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
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => go(i)}
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
