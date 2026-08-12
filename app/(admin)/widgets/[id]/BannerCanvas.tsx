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

type Rect = { x: number; y: number; w: number; h: number };
type Member = { id: string; ox: number; oy: number; ow: number; oh: number };
type DragState = {
  mode: "move" | Dir;
  startX: number;
  startY: number;
  members: Member[]; // captured origins of every element that moves/resizes together
  bx: number; // captured bounding box of the members
  by: number;
  bw: number;
  bh: number;
  aspect: number;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
const snapTo = (v: number, step: number) => (step > 0 ? Math.round(v / step) * step : v);

// Snap a rectangle to the grid. Dimensions keep at least MIN.
function snapRect(g: Rect, step: number): Rect {
  return {
    x: snapTo(g.x, step),
    y: snapTo(g.y, step),
    w: Math.max(MIN, snapTo(g.w, step)),
    h: Math.max(MIN, snapTo(g.h, step)),
  };
}

// The bounding box of a set of element rectangles.
function bboxOf(els: Rect[]): Rect {
  const x = Math.min(...els.map((e) => e.x));
  const y = Math.min(...els.map((e) => e.y));
  const w = Math.max(...els.map((e) => e.x + e.w)) - x;
  const h = Math.max(...els.map((e) => e.y + e.h)) - y;
  return { x, y, w, h };
}

// The ids that move together with the current selection: the whole group if the
// selected element is grouped, otherwise just the selected element.
function activeGroup(items: BannerElement[], selectedId: string | null): string[] {
  if (!selectedId) return [];
  const sel = items.find((i) => i.id === selectedId);
  if (!sel) return [];
  if (sel.groupId) return items.filter((i) => i.groupId === sel.groupId).map((i) => i.id);
  return [selectedId];
}

// Resize a rectangle by dragging handle `dir`. `lock` (Shift on a corner) keeps
// the aspect ratio. Elements may bleed off the canvas, so no position clamping.
function resizeRect(
  o: Rect,
  dir: Dir,
  dx: number,
  dy: number,
  cw: number,
  ch: number,
  lock: boolean,
  aspect: number,
): Rect {
  const corner = dir.length === 2;
  const MAX = Math.max(cw, ch) * 4;
  let x = o.x;
  let y = o.y;
  let w = o.w;
  let h = o.h;

  if (lock && corner) {
    const a = aspect || 1;
    let nw = clamp(dir.includes("e") ? o.w + dx : o.w - dx, MIN, MAX);
    let nh = nw / a;
    if (nh < MIN) {
      nh = MIN;
      nw = nh * a;
    }
    w = nw;
    h = nh;
    if (dir.includes("w")) x = o.x + (o.w - nw);
    if (dir.includes("n")) y = o.y + (o.h - nh);
    return { x, y, w, h };
  }

  if (dir.includes("e")) w = clamp(o.w + dx, MIN, MAX);
  if (dir.includes("s")) h = clamp(o.h + dy, MIN, MAX);
  if (dir.includes("w")) {
    const nw = clamp(o.w - dx, MIN, MAX);
    x = o.x + (o.w - nw);
    w = nw;
  }
  if (dir.includes("n")) {
    const nh = clamp(o.h - dy, MIN, MAX);
    y = o.y + (o.h - nh);
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

  // Handlers close over the current render's items/scale — correct for a drag,
  // since only the captured members change (computed from their captured origins).
  function onMove(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const s = scale || 1;
    const dx = (e.clientX - d.startX) / s;
    const dy = (e.clientY - d.startY) / s;

    if (d.mode === "move") {
      // Translate the whole group; clamp the bounding box (not each element) so
      // relative positions are preserved and the box stays grabbable.
      let nbx = clamp(d.bx + dx, -(d.bw - MIN), cw - MIN);
      let nby = clamp(d.by + dy, -(d.bh - MIN), ch - MIN);
      if (snap) {
        nbx = snapTo(nbx, grid);
        nby = snapTo(nby, grid);
      }
      const tx = nbx - d.bx;
      const ty = nby - d.by;
      setItems(
        items.map((it) => {
          const m = d.members.find((mm) => mm.id === it.id);
          return m ? ({ ...it, x: m.ox + tx, y: m.oy + ty } as BannerElement) : it;
        }),
      );
      return;
    }

    // Resize: scale every member within the group's bounding box.
    const dir = d.mode;
    const lock = dir.length === 2 && e.shiftKey;
    let box = resizeRect({ x: d.bx, y: d.by, w: d.bw, h: d.bh }, dir, dx, dy, cw, ch, e.shiftKey, d.aspect);
    if (snap && !lock) box = snapRect(box, grid);
    const sx = d.bw > 0 ? box.w / d.bw : 1;
    const sy = d.bh > 0 ? box.h / d.bh : 1;
    setItems(
      items.map((it) => {
        const m = d.members.find((mm) => mm.id === it.id);
        if (!m) return it;
        return {
          ...it,
          x: box.x + (m.ox - d.bx) * sx,
          y: box.y + (m.oy - d.by) * sy,
          w: Math.max(MIN, m.ow * sx),
          h: Math.max(MIN, m.oh * sy),
        } as BannerElement;
      }),
    );
  }
  function endDrag() {
    drag.current = null;
    dragCtl.current?.abort();
    dragCtl.current = null;
  }
  function beginDrag(e: ReactPointerEvent, mode: "move" | Dir, anchorId: string) {
    e.preventDefault();
    e.stopPropagation();
    const anchor = items.find((i) => i.id === anchorId);
    if (!anchor) return;
    setSelectedId(anchorId);
    const ids = anchor.groupId
      ? items.filter((i) => i.groupId === anchor.groupId).map((i) => i.id)
      : [anchorId];
    const members: Member[] = items
      .filter((i) => ids.includes(i.id))
      .map((i) => ({ id: i.id, ox: i.x, oy: i.y, ow: i.w, oh: i.h }));
    const bb = bboxOf(members.map((m) => ({ x: m.ox, y: m.oy, w: m.ow, h: m.oh })));
    drag.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      members,
      bx: bb.x,
      by: bb.y,
      bw: bb.w,
      bh: bb.h,
      aspect: bb.h > 0 ? bb.w / bb.h : 1,
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

  // The active selection (single element or a whole group) and its bounding box.
  const activeIds = activeGroup(items, selectedId);
  const activeEls = items.filter((e) => activeIds.includes(e.id));
  const selBox = activeEls.length > 0 ? bboxOf(activeEls) : null;
  const isGroup = activeEls.length > 1;

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
              const member = isGroup && activeIds.includes(el.id);
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => beginDrag(e, "move", el.id)}
                  style={{
                    position: "absolute",
                    left: el.x,
                    top: el.y,
                    width: el.w,
                    height: el.h,
                    cursor: "move",
                    opacity: el.hidden ? 0.35 : 1,
                    outline: el.hidden
                      ? `${2 / scale}px dashed #94a3b8`
                      : member
                        ? `${1.5 / scale}px dashed rgba(9,69,130,0.7)`
                        : "none",
                  }}
                >
                  <div style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
                    <BannerElementView el={el} />
                  </div>
                </div>
              );
            })}

            {/* Selection overlay: a bounding box (single element or whole group)
                with resize handles. The box itself is click-through so the
                elements beneath stay draggable; only the handles capture. */}
            {selBox && (
              <div
                style={{
                  position: "absolute",
                  left: selBox.x,
                  top: selBox.y,
                  width: selBox.w,
                  height: selBox.h,
                  pointerEvents: "none",
                  outline: `${2 / scale}px solid #094582`,
                }}
              >
                {HANDLES.map((dir) => (
                  <div
                    key={dir}
                    onPointerDown={(e) => beginDrag(e, dir, selectedId as string)}
                    style={{
                      position: "absolute",
                      width: hs,
                      height: hs,
                      background: "#fff",
                      border: `${1.5 / scale}px solid #094582`,
                      borderRadius: hs / 4,
                      cursor: CURSORS[dir],
                      pointerEvents: "auto",
                      ...handlePos(dir, selBox.w, selBox.h, hs),
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
