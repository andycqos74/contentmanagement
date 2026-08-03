"use client";

import { ColorField, NumberField, RangeField, SelectField } from "@/components/admin/fields";
import { FocalPointField } from "@/components/admin/FocalPointField";
import { ImageField } from "@/components/admin/ImageField";
import type { BannerElement, SliderSlide } from "@/lib/widgets/registry";
import { BannerControls } from "./BannerControls";

export function SliderControls({
  items,
  setItems,
  currentSlide,
  selectedElId,
  setSelectedElId,
}: {
  items: SliderSlide[];
  setItems: (v: SliderSlide[]) => void;
  currentSlide: number;
  selectedElId: string | null;
  setSelectedElId: (id: string | null) => void;
}) {
  const idx = Math.min(currentSlide, items.length - 1);
  const slide = items[idx];
  if (!slide) return null;

  const patchSlide = (p: Partial<SliderSlide>) =>
    setItems(items.map((s, i) => (i === idx ? { ...s, ...p } : s)));
  const setElements = (els: BannerElement[]) =>
    setItems(items.map((s, i) => (i === idx ? { ...s, elements: els } : s)));

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-slate-200 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Slide {idx + 1} background
        </p>
        <ImageField
          label="Background image"
          value={slide.bgImage}
          onChange={(v) => patchSlide({ bgImage: v })}
        />
        {slide.bgImage && (
          <FocalPointField
            imageUrl={slide.bgImage}
            x={slide.bgPosX}
            y={slide.bgPosY}
            onChange={(x, y) => patchSlide({ bgPosX: x, bgPosY: y })}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            label="Background colour"
            value={slide.bgColor}
            onChange={(v) => patchSlide({ bgColor: v })}
          />
          <SelectField
            label="Fit"
            value={slide.bgFit}
            onChange={(v) => patchSlide({ bgFit: v })}
            options={[
              { value: "cover", label: "Cover" },
              { value: "contain", label: "Contain" },
              { value: "tile", label: "Tile" },
            ]}
          />
          {slide.bgFit === "tile" && (
            <NumberField
              label="Tile size (px)"
              min={0}
              max={1000}
              value={slide.bgTileSize}
              onChange={(v) => patchSlide({ bgTileSize: v })}
            />
          )}
          <RangeField
            label="Overlay"
            min={0}
            max={1}
            step={0.05}
            value={slide.overlayOpacity}
            onChange={(v) => patchSlide({ overlayOpacity: v })}
          />
        </div>
      </div>

      <BannerControls
        items={slide.elements as BannerElement[]}
        setItems={setElements}
        selectedId={selectedElId}
        setSelectedId={setSelectedElId}
      />
    </div>
  );
}
