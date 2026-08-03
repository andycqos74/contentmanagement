"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef } from "react";
import { Field } from "./fields";

const clamp = (v: number) => Math.max(0, Math.min(100, v));

// Visual focal-point picker: drag the target over the image to choose which part
// stays in view when the background is cropped (maps to CSS background-position).
export function FocalPointField({
  label = "Focal point",
  imageUrl,
  x,
  y,
  onChange,
}: {
  label?: string;
  imageUrl: string;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);

  if (!imageUrl) {
    return (
      <Field label={label}>
        <p className="rounded-md border border-dashed border-slate-300 px-3 py-3 text-center text-[11px] text-slate-400">
          Add a background image to set its focal point.
        </p>
      </Field>
    );
  }

  const apply = (clientX: number, clientY: number) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    onChange(
      Math.round(clamp(((clientX - r.left) / r.width) * 100)),
      Math.round(clamp(((clientY - r.top) / r.height) * 100)),
    );
  };

  const start = (e: ReactPointerEvent) => {
    e.preventDefault();
    apply(e.clientX, e.clientY);
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    window.addEventListener("pointermove", (ev) => apply(ev.clientX, ev.clientY), { signal: c.signal });
    window.addEventListener("pointerup", () => c.abort(), { signal: c.signal });
  };

  return (
    <Field label={`${label}: ${Math.round(x)}% / ${Math.round(y)}%`}>
      <div
        ref={boxRef}
        onPointerDown={start}
        className="relative w-full cursor-crosshair overflow-hidden rounded-md border border-slate-300 bg-slate-100 select-none"
        style={{ aspectRatio: "16 / 9", touchAction: "none" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: "cover", objectPosition: `${x}% ${y}%` }}
        />
        <div
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${x}%`, top: `${y}%`, boxShadow: "0 0 0 2px rgba(9,69,130,.7), 0 1px 4px rgba(0,0,0,.4)" }}
        />
      </div>
    </Field>
  );
}
