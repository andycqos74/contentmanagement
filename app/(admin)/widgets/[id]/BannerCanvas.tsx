"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Grid3x3, Magnet, ZoomIn, ZoomOut } from "lucide-react";
import {
  BannerElementView,
  bannerBackgroundStyle,
} from "@/components/widgets/banner/BannerElementView";
import { ensureFontLoaded, fontStack } from "@/lib/widgets/fonts";
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
  aspect: number;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
const snapTo = (v: number, step: number) => (step > 0 ? Math.round(v / step) * step : v);

// Snap an element's geometry to the grid. Dimensions keep at least MIN.
function snapGeo(g: { x?: number; y?: number; w?: number; h?: number }, step: number) {
  const out = { ...g };
  if (out.x != null) out.x = snapTo(out.x, step);
  if (out.y != null) out.y = snapTo(out.y, step);
  if (out.w != null) out.w = Math.max(MIN, snapTo(out.w, step));
  if (out.h != null) out.h = Math.max(MIN, snapTo(out.h, step));
  return out;
}

// Elements may extend beyond the canvas (bleed off the edges); keep at least MIN
// on-canvas when moving so they stay grabbable.
function moveGeo(d: DragState, dx: number, dy: number, cw: number, ch: number) {
  return {
    x: clamp(d.ox + dx, -(d.ow - MIN), cw - MIN),
    y: clamp(d.oy + dy, -(d.oh - MIN), ch - MIN),
  };
}

function resizeGeo(d: DragState, dx: number, dy: number, cw: number, ch: number, lock: boolean) {
  const dir = d.mode as Dir;
  const corner = dir.length === 2;
  const MAX = Math.max(cw, ch) * 4;
  let x = d.ox;
  let y = d.oy;
  let w = d.ow;
  let h = d.oh;

  if (lock && corner) {
    // Preserve aspect ratio (Shift on a corner handle).
    const aspect = d.aspect || 1;
    let nw = clamp(dir.includes("e") ? d.ow + dx : d.ow - dx, MIN, MAX);
    let nh = nw / aspect;
    if (nh < MIN) {
      nh = MIN;
      nw = nh * aspect;
    }
    w = nw;
    h = nh;
    if (dir.includes("w")) x = d.ox + (d.ow - nw);
    if (dir.includes("n")) y = d.oy + (d.oh - nh);
    return { x, y, w, h };
  }

  if (dir.includes("e")) w = clamp(d.ow + dx, MIN, MAX);
  if (dir.includes("s")) h = clamp(d.oh + dy, MIN, MAX);
  if (dir.includes("w")) {
    const nw = clamp(d.ow - dx, MIN, MAX);
    x = d.ox + (d.ow - nw);
    w = nw;
  }
  if (dir.includes("n")) {
    const nh = clamp(d.oh - dy, MIN, MAX);
    y = d.oy + (d.oh - nh);
    h = nh;
  }
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
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0.4);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [snap, setSnap] = useState(false);
  const [grid, setGrid] = useState(24);
  const cw = Math.max(1, settings.width || 1);
  const ch = Math.max(1, settings.height || 1);
  const scale = fit * zoom;
  const drag = useRef<DragState | null>(null);
  const dragCtl = useRef<AbortController | null>(null);

  useEffect(() => ensureFontLoaded(settings.fontFamily), [settings.fontFamily]);

  // Measure the outer container (never scrollbars) — NOT the scroll viewport —
  // so the fit-scale can't feed back into its own measurement when zoomed.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const measure = () => setFit(el.clientWidth / cw);
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
    const lock = d.mode !== "move" && e.shiftKey;
    let geo: { x?: number; y?: number; w?: number; h?: number } =
      d.mode === "move" ? moveGeo(d, dx, dy, cw, ch) : resizeGeo(d, dx, dy, cw, ch, e.shiftKey);
    // Snap to grid unless aspect-locking a corner resize (Shift).
    if (snap && !lock) geo = snapGeo(geo, grid);
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
      aspect: el.h > 0 ? el.w / el.h : 1,
    };
    dragCtl.current?.abort();
    const ctl = new AbortController();
    dragCtl.current = ctl;
    window.addEventListener("pointermove", onMove, { signal: ctl.signal });
    window.addEventListener("pointerup", endDrag, { signal: ctl.signal });
  }

  const hs = 12 / scale; // handle size in canvas units (~12px on screen)
  const zoomPct = Math.round(zoom * 100);
  const setZoomClamped = (z: number) => setZoom(clamp(Math.round(z * 100) / 100, 0.25, 4));
  const tbtn = (on: boolean) =>
    `inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
      on ? "bg-[#094582]/10 text-[#094582]" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div ref={measureRef} className="rounded-lg border border-slate-200">
      {/* Authoring toolbar (editor-only) */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-2 py-1.5">
        <button type="button" onClick={() => setShowGrid((v) => !v)} className={tbtn(showGrid)}>
          <Grid3x3 size={14} /> Grid
        </button>
        <button type="button" onClick={() => setSnap((v) => !v)} className={tbtn(snap)}>
          <Magnet size={14} /> Snap
        </button>
        {(showGrid || snap) && (
          <select
            value={grid}
            onChange={(e) => setGrid(Number(e.target.value))}
            className="rounded border border-slate-300 px-1 py-0.5 text-xs text-slate-600"
            title="Grid size"
          >
            {[8, 12, 16, 20, 24, 32, 40, 50].map((g) => (
              <option key={g} value={g}>
                {g}px
              </option>
            ))}
          </select>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setZoomClamped(zoom - 0.25)}
            disabled={zoom <= 0.25}
            className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            title="Zoom out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="min-w-[3rem] rounded px-1 py-0.5 text-center text-xs font-medium tabular-nums text-slate-600 hover:bg-slate-100"
            title="Reset zoom to fit"
          >
            {zoomPct}%
          </button>
          <button
            type="button"
            onClick={() => setZoomClamped(zoom + 0.25)}
            disabled={zoom >= 4}
            className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            title="Zoom in"
          >
            <ZoomIn size={15} />
          </button>
        </div>
      </div>

      {/* Scroll viewport — scales the fixed design canvas to fit (× zoom) */}
      <div
        onPointerDown={() => setSelectedId(null)}
        className="rounded-b-lg"
        style={{
          width: "100%",
          overflow: zoom > 1 ? "auto" : "hidden",
          maxHeight: zoom > 1 ? "75vh" : undefined,
          background: "#f1f5f9",
        }}
      >
        <div style={{ position: "relative", width: cw * scale, height: ch * scale }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: cw,
              height: ch,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              fontFamily: fontStack(settings.fontFamily),
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
            {showGrid && grid > 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  backgroundImage:
                    "linear-gradient(to right, rgba(9,69,130,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(9,69,130,0.18) 1px, transparent 1px)",
                  backgroundSize: `${grid}px ${grid}px`,
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
    </div>
  );
}
