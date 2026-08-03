"use client";

import { nanoid } from "nanoid";
import {
  BringToFront,
  Image as ImageIcon,
  MousePointerClick,
  SendToBack,
  Trash2,
  Type,
} from "lucide-react";
import {
  ColorField,
  NumberField,
  RangeField,
  SelectField,
  TextField,
} from "@/components/admin/fields";
import { ImageField } from "@/components/admin/ImageField";
import { UrlField } from "@/components/admin/UrlField";
import type { BannerElement } from "@/lib/widgets/registry";

const addBtn =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";

export function BannerControls({
  items,
  setItems,
  selectedId,
  setSelectedId,
}: {
  items: BannerElement[];
  setItems: (v: BannerElement[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}) {
  const stagger = 40 + (items.length % 5) * 24;

  function add(el: BannerElement) {
    setItems([...items, el]);
    setSelectedId(el.id);
  }

  const addText = () =>
    add({
      id: nanoid(6),
      type: "text",
      x: stagger,
      y: stagger,
      w: 320,
      h: 72,
      text: "New text",
      color: "#ffffff",
      fontSize: 30,
      fontWeight: "700",
      align: "center",
      bgColor: "#000000",
      bgOpacity: 0,
      rounded: 0,
    });
  const addImage = () =>
    add({
      id: nanoid(6),
      type: "image",
      x: stagger,
      y: stagger,
      w: 220,
      h: 160,
      imageUrl: "",
      fit: "cover",
      rounded: 0,
    });
  const addButton = () =>
    add({
      id: nanoid(6),
      type: "button",
      x: stagger,
      y: stagger,
      w: 170,
      h: 50,
      text: "Button",
      url: "",
      bg: "#094582",
      color: "#ffffff",
      fontSize: 16,
      rounded: 8,
    });

  const sel = items.find((e) => e.id === selectedId) ?? null;

  function patch(id: string, p: Record<string, unknown>) {
    setItems(items.map((e) => (e.id === id ? ({ ...e, ...p } as BannerElement) : e)));
  }
  function remove(id: string) {
    setItems(items.filter((e) => e.id !== id));
    setSelectedId(null);
  }
  function reorder(id: string, toFront: boolean) {
    const el = items.find((e) => e.id === id);
    if (!el) return;
    const rest = items.filter((e) => e.id !== id);
    setItems(toFront ? [...rest, el] : [el, ...rest]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addText} className={addBtn}>
          <Type size={15} /> Text
        </button>
        <button type="button" onClick={addImage} className={addBtn}>
          <ImageIcon size={15} /> Image
        </button>
        <button type="button" onClick={addButton} className={addBtn}>
          <MousePointerClick size={15} /> Button
        </button>
      </div>

      {!sel ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">
          Click an element on the banner to edit it, or add one above. Drag to move, drag the
          handles to resize.
        </p>
      ) : (
        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {sel.type}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => reorder(sel.id, false)}
                title="Send to back"
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <SendToBack size={15} />
              </button>
              <button
                type="button"
                onClick={() => reorder(sel.id, true)}
                title="Bring to front"
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <BringToFront size={15} />
              </button>
              <button
                type="button"
                onClick={() => remove(sel.id)}
                title="Delete"
                className="rounded p-1 text-red-500 hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {sel.type === "text" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <TextField
                  label="Text"
                  value={sel.text}
                  onChange={(v) => patch(sel.id, { text: v })}
                  textarea
                />
              </div>
              <ColorField label="Colour" value={sel.color} onChange={(v) => patch(sel.id, { color: v })} />
              <NumberField
                label="Font size"
                min={8}
                max={200}
                value={sel.fontSize}
                onChange={(v) => patch(sel.id, { fontSize: v })}
              />
              <SelectField
                label="Weight"
                value={sel.fontWeight}
                onChange={(v) => patch(sel.id, { fontWeight: v })}
                options={[
                  { value: "400", label: "Regular" },
                  { value: "600", label: "Semibold" },
                  { value: "700", label: "Bold" },
                  { value: "800", label: "Extra bold" },
                ]}
              />
              <SelectField
                label="Align"
                value={sel.align}
                onChange={(v) => patch(sel.id, { align: v })}
                options={[
                  { value: "left", label: "Left" },
                  { value: "center", label: "Center" },
                  { value: "right", label: "Right" },
                ]}
              />
              <ColorField
                label="Box background"
                value={sel.bgColor}
                onChange={(v) => patch(sel.id, { bgColor: v })}
              />
              <RangeField
                label="Box opacity"
                min={0}
                max={1}
                step={0.05}
                value={sel.bgOpacity}
                onChange={(v) => patch(sel.id, { bgOpacity: v })}
              />
              <RangeField
                label="Box corner radius"
                min={0}
                max={100}
                value={sel.rounded ?? 0}
                onChange={(v) => patch(sel.id, { rounded: v })}
                suffix="px"
              />
            </div>
          )}

          {sel.type === "image" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <ImageField
                  label="Image"
                  value={sel.imageUrl}
                  onChange={(v) => patch(sel.id, { imageUrl: v })}
                />
              </div>
              <SelectField
                label="Fit"
                value={sel.fit}
                onChange={(v) => patch(sel.id, { fit: v })}
                options={[
                  { value: "cover", label: "Cover" },
                  { value: "contain", label: "Contain" },
                ]}
              />
              <RangeField
                label="Corner radius"
                min={0}
                max={200}
                value={sel.rounded}
                onChange={(v) => patch(sel.id, { rounded: v })}
                suffix="px"
              />
            </div>
          )}

          {sel.type === "button" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <TextField label="Label" value={sel.text} onChange={(v) => patch(sel.id, { text: v })} />
              </div>
              <div className="col-span-2">
                <UrlField label="Link URL" value={sel.url} onChange={(v) => patch(sel.id, { url: v })} />
              </div>
              <ColorField label="Background" value={sel.bg} onChange={(v) => patch(sel.id, { bg: v })} />
              <ColorField label="Text colour" value={sel.color} onChange={(v) => patch(sel.id, { color: v })} />
              <NumberField
                label="Font size"
                min={8}
                max={80}
                value={sel.fontSize}
                onChange={(v) => patch(sel.id, { fontSize: v })}
              />
              <RangeField
                label="Corner radius"
                min={0}
                max={40}
                value={sel.rounded}
                onChange={(v) => patch(sel.id, { rounded: v })}
                suffix="px"
              />
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
            <NumberField label="X" value={Math.round(sel.x)} onChange={(v) => patch(sel.id, { x: v })} />
            <NumberField label="Y" value={Math.round(sel.y)} onChange={(v) => patch(sel.id, { y: v })} />
            <NumberField label="W" value={Math.round(sel.w)} onChange={(v) => patch(sel.id, { w: v })} />
            <NumberField label="H" value={Math.round(sel.h)} onChange={(v) => patch(sel.id, { h: v })} />
          </div>
        </div>
      )}
    </div>
  );
}
