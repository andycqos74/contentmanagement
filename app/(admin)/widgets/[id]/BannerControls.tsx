"use client";

import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import {
  BringToFront,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  MousePointerClick,
  Save,
  SendToBack,
  Shapes,
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
import {
  applyPresetStyle,
  presetStyleFromElement,
  type BannerElement,
  type BannerElementType,
} from "@/lib/widgets/registry";

type Preset = { id: string; name: string; type: BannerElementType; data: Record<string, unknown> };

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
  const [presets, setPresets] = useState<Preset[]>([]);

  // Shared element presets (available in every widget's editor).
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/presets")
      .then((r) => (r.ok ? r.json() : { presets: [] }))
      .then((d) => {
        if (alive) setPresets(d.presets ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function add(el: BannerElement) {
    setItems([...items, el]);
    setSelectedId(el.id);
  }

  const addText = () =>
    add({
      id: nanoid(6),
      type: "text",
      hidden: false,
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
      hidden: false,
      x: stagger,
      y: stagger,
      w: 220,
      h: 160,
      imageUrl: "",
      fit: "cover",
      rounded: 0,
      opacity: 1,
    });
  const addShape = () =>
    add({
      id: nanoid(6),
      type: "shape",
      hidden: false,
      x: stagger,
      y: stagger,
      w: 200,
      h: 200,
      shape: "rectangle",
      bgColor: "#094582",
      bgOpacity: 1,
      rounded: 0,
    });
  const addButton = () =>
    add({
      id: nanoid(6),
      type: "button",
      hidden: false,
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
  function duplicate(id: string) {
    const idx = items.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const src = items[idx];
    const copy = { ...src, id: nanoid(6), x: src.x + 24, y: src.y + 24 } as BannerElement;
    setItems([...items.slice(0, idx + 1), copy, ...items.slice(idx + 1)]);
    setSelectedId(copy.id);
  }
  function toggleHidden(id: string) {
    const el = items.find((e) => e.id === id);
    if (el) patch(id, { hidden: !el.hidden });
  }
  function applyPreset(el: BannerElement, preset: Preset) {
    const next = applyPresetStyle(el, preset.data);
    setItems(items.map((e) => (e.id === el.id ? next : e)));
  }
  async function savePreset(el: BannerElement) {
    const name = window.prompt("Save this element’s style as a preset named:");
    if (!name || !name.trim()) return;
    const res = await fetch("/api/admin/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), type: el.type, data: presetStyleFromElement(el) }),
    });
    if (res.ok) {
      const d = await res.json();
      setPresets((p) => [...p, d.preset]);
    } else {
      alert("Could not save preset");
    }
  }
  async function deletePreset(id: string) {
    setPresets((p) => p.filter((x) => x.id !== id));
    await fetch(`/api/admin/presets/${id}`, { method: "DELETE" }).catch(() => {});
  }

  const typePresets = sel ? presets.filter((p) => p.type === sel.type) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addText} className={addBtn}>
          <Type size={15} /> Text
        </button>
        <button type="button" onClick={addImage} className={addBtn}>
          <ImageIcon size={15} /> Image
        </button>
        <button type="button" onClick={addShape} className={addBtn}>
          <Shapes size={15} /> Shape
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
              {sel.hidden && <span className="ml-1 normal-case text-slate-400">· hidden</span>}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleHidden(sel.id)}
                title={sel.hidden ? "Show" : "Hide"}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                {sel.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                onClick={() => duplicate(sel.id)}
                title="Duplicate"
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <Copy size={15} />
              </button>
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
              <RangeField
                label="Opacity"
                min={0}
                max={1}
                step={0.05}
                value={sel.opacity ?? 1}
                onChange={(v) => patch(sel.id, { opacity: v })}
              />
            </div>
          )}

          {sel.type === "shape" && (
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Shape"
                value={sel.shape}
                onChange={(v) => patch(sel.id, { shape: v })}
                options={[
                  { value: "rectangle", label: "Rectangle" },
                  { value: "ellipse", label: "Ellipse / circle" },
                  { value: "triangle", label: "Triangle" },
                  { value: "diamond", label: "Diamond" },
                ]}
              />
              {sel.shape === "rectangle" && (
                <RangeField
                  label="Corner radius"
                  min={0}
                  max={300}
                  value={sel.rounded}
                  onChange={(v) => patch(sel.id, { rounded: v })}
                  suffix="px"
                />
              )}
              <ColorField
                label="Fill colour"
                value={sel.bgColor}
                onChange={(v) => patch(sel.id, { bgColor: v })}
              />
              <RangeField
                label="Fill opacity"
                min={0}
                max={1}
                step={0.05}
                value={sel.bgOpacity}
                onChange={(v) => patch(sel.id, { bgOpacity: v })}
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

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Presets
              </span>
              <button
                type="button"
                onClick={() => savePreset(sel)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Save size={13} /> Save style
              </button>
            </div>
            {typePresets.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                No {sel.type} presets yet. Save this element&rsquo;s style to reuse it on any widget.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {typePresets.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center overflow-hidden rounded-full border border-slate-300 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => applyPreset(sel, p)}
                      title="Apply this preset"
                      className="py-1 pl-2.5 pr-1.5 font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {p.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePreset(p.id)}
                      title="Delete preset"
                      className="border-l border-slate-200 px-1.5 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

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
