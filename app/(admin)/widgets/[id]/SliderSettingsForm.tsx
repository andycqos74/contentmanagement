"use client";

import { NumberField, RangeField, SelectField, ToggleField } from "@/components/admin/fields";
import type { SliderSettings } from "@/lib/widgets/registry";

export function SliderSettingsForm({
  settings,
  set,
}: {
  settings: SliderSettings;
  set: (patch: Partial<SliderSettings>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <SelectField
        label="Width"
        value={settings.widthMode}
        onChange={(v) => set({ widthMode: v })}
        options={[
          { value: "full", label: "Full width" },
          { value: "fixed", label: "Fixed / partial" },
        ]}
      />
      <NumberField
        label={settings.widthMode === "fixed" ? "Max width (px)" : "Design width (px)"}
        min={320}
        max={2000}
        value={settings.width}
        onChange={(v) => set({ width: v })}
      />
      <NumberField label="Height (px)" min={80} max={1200} value={settings.height} onChange={(v) => set({ height: v })} />
      <RangeField label="Corner radius" min={0} max={64} value={settings.rounded} onChange={(v) => set({ rounded: v })} suffix="px" />
      <SelectField
        label="Transition"
        value={settings.transition}
        onChange={(v) => set({ transition: v })}
        options={[
          { value: "slide", label: "Slide" },
          { value: "fade", label: "Fade" },
        ]}
      />
      <NumberField
        label="Autoplay interval (ms)"
        min={1000}
        max={20000}
        value={settings.intervalMs}
        onChange={(v) => set({ intervalMs: v })}
      />
      <div className="col-span-2 grid grid-cols-3 gap-x-4 rounded-md border border-slate-200 p-2">
        <ToggleField label="Autoplay" value={settings.autoplay} onChange={(v) => set({ autoplay: v })} />
        <ToggleField label="Arrows" value={settings.showArrows} onChange={(v) => set({ showArrows: v })} />
        <ToggleField label="Dots" value={settings.showDots} onChange={(v) => set({ showDots: v })} />
      </div>
    </div>
  );
}
