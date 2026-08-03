"use client";

import { ColorField, FontField, NumberField, RangeField, SelectField } from "@/components/admin/fields";
import { FocalPointField } from "@/components/admin/FocalPointField";
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
      <div className="col-span-2">
        <FontField value={settings.fontFamily} onChange={(v) => set({ fontFamily: v })} />
      </div>
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
          { value: "tile", label: "Tile / repeat" },
        ]}
      />
      {settings.bgFit === "tile" && (
        <NumberField
          label="Tile size (px, 0 = natural)"
          min={0}
          max={1000}
          value={settings.bgTileSize}
          onChange={(v) => set({ bgTileSize: v })}
        />
      )}
      <div className="col-span-2">
        <ImageField
          label="Background image"
          value={settings.bgImage}
          onChange={(v) => set({ bgImage: v })}
        />
      </div>
      {settings.bgImage && (
        <div className="col-span-2">
          <FocalPointField
            imageUrl={settings.bgImage}
            x={settings.bgPosX}
            y={settings.bgPosY}
            onChange={(x, y) => set({ bgPosX: x, bgPosY: y })}
          />
        </div>
      )}
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
