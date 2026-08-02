"use client";

import { ColorField, NumberField, RangeField, SelectField } from "@/components/admin/fields";
import { ImageField } from "@/components/admin/ImageField";
import type { BannerSettings } from "@/lib/widgets/registry";

export function BannerSettingsForm({
  settings,
  set,
}: {
  settings: BannerSettings;
  set: (patch: Partial<BannerSettings>) => void;
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
      <NumberField
        label="Height (px)"
        min={80}
        max={1200}
        value={settings.height}
        onChange={(v) => set({ height: v })}
      />
      <RangeField
        label="Corner radius"
        min={0}
        max={64}
        value={settings.rounded}
        onChange={(v) => set({ rounded: v })}
        suffix="px"
      />
      <ColorField
        label="Background colour"
        value={settings.bgColor}
        onChange={(v) => set({ bgColor: v })}
      />
      <SelectField
        label="Background fit"
        value={settings.bgFit}
        onChange={(v) => set({ bgFit: v })}
        options={[
          { value: "cover", label: "Cover" },
          { value: "contain", label: "Contain" },
        ]}
      />
      <div className="col-span-2">
        <ImageField
          label="Background image"
          value={settings.bgImage}
          onChange={(v) => set({ bgImage: v })}
        />
      </div>
      <RangeField
        label="Overlay"
        min={0}
        max={1}
        step={0.05}
        value={settings.overlayOpacity}
        onChange={(v) => set({ overlayOpacity: v })}
      />
    </div>
  );
}
