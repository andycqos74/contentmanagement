"use client";

import { nanoid } from "nanoid";
import { ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type {
  BannerElement,
  BannerSettings,
  SliderSettings,
  SliderSlide,
} from "@/lib/widgets/registry";
import { BannerCanvas } from "./BannerCanvas";

export function SliderStage({
  settings,
  items,
  setItems,
  currentSlide,
  setCurrentSlide,
  selectedElId,
  setSelectedElId,
}: {
  settings: SliderSettings;
  items: SliderSlide[];
  setItems: (v: SliderSlide[]) => void;
  currentSlide: number;
  setCurrentSlide: (i: number) => void;
  selectedElId: string | null;
  setSelectedElId: (id: string | null) => void;
}) {
  const idx = Math.min(currentSlide, items.length - 1);
  const slide = items[idx];

  // Build directly (no schema.parse) so an in-progress width/height never throws.
  const perSlide: BannerSettings = {
    widthMode: settings.widthMode,
    width: Math.max(1, settings.width || 1),
    height: Math.max(1, settings.height || 1),
    rounded: 0,
    bgColor: slide?.bgColor ?? "#0b3f70",
    bgImage: slide?.bgImage ?? "",
    bgFit: slide?.bgFit ?? "cover",
    bgTileSize: slide?.bgTileSize ?? 0,
    bgPosX: slide?.bgPosX ?? 50,
    bgPosY: slide?.bgPosY ?? 50,
    overlayOpacity: slide?.overlayOpacity ?? 0,
    fontFamily: settings.fontFamily,
  };

  const setElements = (els: BannerElement[]) =>
    setItems(items.map((s, i) => (i === idx ? { ...s, elements: els } : s)));

  const switchSlide = (i: number) => {
    setSelectedElId(null);
    setCurrentSlide(i);
  };
  const addSlide = () => {
    const next: SliderSlide = {
      bgColor: "#0b3f70",
      bgImage: "",
      bgFit: "cover",
      bgTileSize: 0,
      bgPosX: 50,
      bgPosY: 50,
      overlayOpacity: 0,
      hidden: false,
      elements: [],
    };
    setItems([...items, next]);
    switchSlide(items.length);
  };
  const removeSlide = () => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
    switchSlide(Math.max(0, idx - 1));
  };
  const duplicateSlide = () => {
    if (!slide) return;
    const copy: SliderSlide = {
      ...slide,
      elements: slide.elements.map((el) => ({ ...el, id: nanoid(6) })),
    };
    setItems([...items.slice(0, idx + 1), copy, ...items.slice(idx + 1)]);
    switchSlide(idx + 1);
  };
  const toggleHidden = () => {
    if (!slide) return;
    setItems(items.map((s, i) => (i === idx ? { ...s, hidden: !s.hidden } : s)));
  };
  const moveSlide = (dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const copy = items.slice();
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    setItems(copy);
    switchSlide(j);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {items.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => switchSlide(i)}
            title={s.hidden ? `Slide ${i + 1} (hidden)` : `Slide ${i + 1}`}
            className={`h-7 w-7 rounded text-xs font-medium ${
              i === idx ? "bg-[#094582] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            } ${s.hidden ? "line-through opacity-60" : ""}`}
          >
            {i + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={addSlide}
          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus size={13} /> Slide
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => moveSlide(-1)}
            disabled={idx <= 0}
            title="Move slide earlier"
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => moveSlide(1)}
            disabled={idx >= items.length - 1}
            title="Move slide later"
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
          <button
            type="button"
            onClick={toggleHidden}
            title={slide?.hidden ? "Show slide" : "Hide slide"}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            {slide?.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <button
            type="button"
            onClick={duplicateSlide}
            title="Duplicate slide"
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <Copy size={15} />
          </button>
          {items.length > 1 && (
            <button
              type="button"
              onClick={removeSlide}
              title="Delete this slide"
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      {slide && (
        <BannerCanvas
          settings={perSlide}
          items={slide.elements as BannerElement[]}
          setItems={setElements}
          selectedId={selectedElId}
          setSelectedId={setSelectedElId}
        />
      )}
    </div>
  );
}
