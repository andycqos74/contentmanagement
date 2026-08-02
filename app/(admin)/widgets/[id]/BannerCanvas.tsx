"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  BannerElementView,
  bannerBackgroundStyle,
} from "@/components/widgets/banner/BannerElementView";
import type { BannerElement, BannerSettings } from "@/lib/widgets/registry";

type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const HANDLES: Dir[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const MIN = 20;

type DragState = {
  id: string;
  mode: "move" | Dir;
  startX: number;
  startY: number;
  ox: number;
  oy: number;
  ow: number;
  oh: number;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

function moveGeo(d: DragState, dx: number, dy: number, cw: number, ch: number) {
  return { x: clamp(d.ox + dx, 0, cw - d.ow), y: clamp(d.oy + dy, 0, ch - d.oh) };
}

function resizeGeo(d: DragState, dx: number, dy: number, cw: number, ch: number) {
  const dir = d.mode as Dir;
  let x = d.ox;
  let y = d.oy;
  let w = d.ow;
  let h = d.oh;
  if (dir.includes("e")) w = Math.max(MIN, d.ow + dx);
  if (dir.includes("s")) h = Math.max(MIN, d.oh + dy);
  if (dir.includes("w")) {
    const nw = Math.max(MIN, d.ow - dx);
    x = d.ox + (d.ow - nw);
    w = nw;
  }
  if (dir.includes("n")) {
    const nh = Math.max(MIN, d.oh - dy);
    y = d.oy + (d.oh - nh);
    h = nh;
  }
  x = clamp(x, 0, cw);
  y = clamp(y, 0, ch);
  w = Math.min(w, cw - x);
  h = Math.min(h, ch - y);
  return { x, y, w, h };
}

function handlePos(dir: Dir, w: number, h: number, hs: number): CSSProperties {
  const half = hs / 2;
  const cx = w / 2 - half;
  const cy = h / 2 - half;
  const map: Record<Dir, CSSProperties> = {
    n: { left: cx, top: -half },
    s: { left: cx, top: h - half },
    e: { left: w - half, top: cy },
    w: { left: -half, top: cy },
    ne: { left: w - half, top: -half },
    nw: { left: -half, top: -half },
    se: { left: w - half, top: h - half },
    sw: { left: -half, top: h - half },
  };
  return map[dir];
}

const CURSORS: Record<Dir, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

export function BannerCanvas({
  settings,
  items,
  setItems,
  selectedId,
  setSelectedId,
}: {
  settings: BannerSettings;
  items: BannerElement[];
  setItems: (v: BannerElement[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const cw = settings.width;
  const ch = settings.height;
  const drag = useRef<DragState | null>(null);
  const dragCtl = useRef<AbortController | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / cw);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cw]);

  // Abort any in-flight drag on unmount.
  useEffect(() => () => dragCtl.current?.abort(), []);

  // Handlers close over the current render's items/scale — which is correct for a
  // drag, since only the dragged element changes (computed from captured origins).
  function onMove(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const s = scale || 1;
    const dx = (e.clientX - d.startX) / s;
    const dy = (e.clientY - d.startY) / s;
    const geo = d.mode === "move" ? moveGeo(d, dx, dy, cw, ch) : resizeGeo(d, dx, dy, cw, ch);
    setItems(items.map((it) => (it.id === d.id ? ({ ...it, ...geo } as BannerElement) : it)));
  }
  function endDrag() {
    drag.current = null;
    dragCtl.current?.abort();
    dragCtl.current = null;
  }
  function startDrag(e: ReactPointerEvent, id: string, mode: "move" | Dir) {
    e.preventDefault();
    e.stopPropagation();
    const el = items.find((i) => i.id === id);
    if (!el) return;
    setSelectedId(id);
    drag.current = {
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      ox: el.x,
      oy: el.y,
      ow: el.w,
      oh: el.h,
    };
    dragCtl.current?.abort();
    const ctl = new AbortController();
    dragCtl.current = ctl;
    window.addEventListener("pointermove", onMove, { signal: ctl.signal });
    window.addEventListener("pointerup", endDrag, { signal: ctl.signal });
  }

  const hs = 12 / scale; // handle size in canvas units (~12px on screen)

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div
        ref={wrapRef}
        onPointerDown={() => setSelectedId(null)}
        style={{
          width: "100%",
          height: ch * scale,
          position: "relative",
          overflow: "hidden",
          background: "#f1f5f9",
        }}
      >
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
          {items.map((el) => {
            const selected = el.id === selectedId;
            return (
              <div
                key={el.id}
                onPointerDown={(e) => startDrag(e, el.id, "move")}
                style={{
                  position: "absolute",
                  left: el.x,
                  top: el.y,
                  width: el.w,
                  height: el.h,
                  cursor: "move",
                  outline: selected ? `${2 / scale}px solid #094582` : "none",
                }}
              >
                <div style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
                  <BannerElementView el={el} />
                </div>
                {selected &&
                  HANDLES.map((dir) => (
                    <div
                      key={dir}
                      onPointerDown={(e) => startDrag(e, el.id, dir)}
                      style={{
                        position: "absolute",
                        width: hs,
                        height: hs,
                        background: "#fff",
                        border: `${1.5 / scale}px solid #094582`,
                        borderRadius: hs / 4,
                        cursor: CURSORS[dir],
                        ...handlePos(dir, el.w, el.h, hs),
                      }}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
