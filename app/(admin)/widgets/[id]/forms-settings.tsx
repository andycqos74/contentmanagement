"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  ColorField,
  NumberField,
  RangeField,
  SelectField,
  TextField,
  ToggleField,
} from "@/components/admin/fields";
import { ImageField } from "@/components/admin/ImageField";
import { UrlField } from "@/components/admin/UrlField";
import type {
  HeroSettings,
  HeroSlide,
  NewsItem,
  NewsSettings,
} from "@/lib/widgets/registry";

type Patch<T> = (patch: Partial<T>) => void;

/* ----------------------------- Hero Slider ----------------------------- */

export function HeroSettingsForm({
  settings,
  set,
}: {
  settings: HeroSettings;
  set: Patch<HeroSettings>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <RangeField label="Height" min={160} max={800} value={settings.height} onChange={(v) => set({ height: v })} suffix="px" />
      <RangeField label="Corner radius" min={0} max={48} value={settings.rounded} onChange={(v) => set({ rounded: v })} suffix="px" />
      <SelectField
        label="Transition"
        value={settings.transition}
        onChange={(v) => set({ transition: v })}
        options={[{ value: "slide", label: "Slide" }, { value: "fade", label: "Fade" }]}
      />
      <SelectField
        label="Text position"
        value={settings.textPosition}
        onChange={(v) => set({ textPosition: v })}
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ]}
      />
      <NumberField label="Autoplay interval (ms)" min={1000} max={20000} value={settings.intervalMs} onChange={(v) => set({ intervalMs: v })} />
      <RangeField label="Overlay" min={0} max={1} step={0.05} value={settings.overlayOpacity} onChange={(v) => set({ overlayOpacity: v })} />
      <ColorField label="Accent / button colour" value={settings.accentColor} onChange={(v) => set({ accentColor: v })} />
      <div className="space-y-1 rounded-md border border-slate-200 p-2">
        <ToggleField label="Autoplay" value={settings.autoplay} onChange={(v) => set({ autoplay: v })} />
        <ToggleField label="Full width" value={settings.fullWidth} onChange={(v) => set({ fullWidth: v })} />
        <ToggleField label="Show arrows" value={settings.showArrows} onChange={(v) => set({ showArrows: v })} />
        <ToggleField label="Show dots" value={settings.showDots} onChange={(v) => set({ showDots: v })} />
      </div>
    </div>
  );
}

/* ----------------------------- Latest News ----------------------------- */

export function NewsSettingsForm({
  settings,
  set,
}: {
  settings: NewsSettings;
  set: Patch<NewsSettings>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <SelectField
        label="Layout"
        value={settings.layout}
        onChange={(v) => set({ layout: v })}
        options={[
          { value: "grid", label: "Grid" },
          { value: "list", label: "List" },
          { value: "carousel", label: "Carousel" },
        ]}
      />
      <NumberField label="Columns (grid)" min={1} max={4} value={settings.columns} onChange={(v) => set({ columns: v })} />
      <NumberField label="Max items" min={1} max={24} value={settings.limit} onChange={(v) => set({ limit: v })} />
      <RangeField label="Excerpt length" min={0} max={300} value={settings.excerptLength} onChange={(v) => set({ excerptLength: v })} />
      <SelectField
        label="Date format"
        value={settings.dateFormat}
        onChange={(v) => set({ dateFormat: v })}
        options={[
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "MMM D, YYYY", label: "MMM D, YYYY" },
          { value: "relative", label: "Relative" },
        ]}
      />
      <SelectField
        label="Card style"
        value={settings.cardStyle}
        onChange={(v) => set({ cardStyle: v })}
        options={[
          { value: "shadow", label: "Shadow" },
          { value: "border", label: "Border" },
          { value: "flat", label: "Flat" },
        ]}
      />
      <TextField label="Read more label" value={settings.readMoreText} onChange={(v) => set({ readMoreText: v })} />
      <ColorField label="Accent colour" value={settings.accentColor} onChange={(v) => set({ accentColor: v })} />
      <div className="col-span-2 grid grid-cols-2 gap-x-4 rounded-md border border-slate-200 p-2 sm:grid-cols-4">
        <ToggleField label="Image" value={settings.showImage} onChange={(v) => set({ showImage: v })} />
        <ToggleField label="Date" value={settings.showDate} onChange={(v) => set({ showDate: v })} />
        <ToggleField label="Category" value={settings.showCategory} onChange={(v) => set({ showCategory: v })} />
        <ToggleField label="Excerpt" value={settings.showExcerpt} onChange={(v) => set({ showExcerpt: v })} />
      </div>
    </div>
  );
}

/* --------------------------- Manual content --------------------------- */

function ItemShell({
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">#{index + 1}</span>
        <div className="flex items-center gap-1">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30">
            <ArrowUp size={14} />
          </button>
          <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30">
            <ArrowDown size={14} />
          </button>
          <button type="button" onClick={onRemove} className="rounded p-1 text-red-500 hover:bg-red-50">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function useListOps<T>(items: T[], setItems: (v: T[]) => void, blank: T) {
  return {
    add: () => setItems([...items, { ...blank }]),
    remove: (i: number) => setItems(items.filter((_, idx) => idx !== i)),
    move: (i: number, dir: -1 | 1) => {
      const j = i + dir;
      if (j < 0 || j >= items.length) return;
      const copy = items.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      setItems(copy);
    },
    patch: (i: number, p: Partial<T>) =>
      setItems(items.map((it, idx) => (idx === i ? { ...it, ...p } : it))),
  };
}

export function HeroContentEditor({
  items,
  setItems,
}: {
  items: HeroSlide[];
  setItems: (v: HeroSlide[]) => void;
}) {
  const ops = useListOps<HeroSlide>(items, setItems, {
    imageUrl: "",
    heading: "",
    subheading: "",
    buttonText: "",
    buttonUrl: "",
    textColor: "#ffffff",
  });
  return (
    <div className="space-y-3">
      {items.map((s, i) => (
        <ItemShell key={i} index={i} count={items.length} onMove={(d) => ops.move(i, d)} onRemove={() => ops.remove(i)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <ImageField label="Image" value={s.imageUrl} onChange={(v) => ops.patch(i, { imageUrl: v })} />
            </div>
            <TextField label="Heading" value={s.heading} onChange={(v) => ops.patch(i, { heading: v })} />
            <TextField label="Subheading" value={s.subheading} onChange={(v) => ops.patch(i, { subheading: v })} />
            <TextField label="Button text" value={s.buttonText} onChange={(v) => ops.patch(i, { buttonText: v })} />
            <UrlField label="Button URL" value={s.buttonUrl} onChange={(v) => ops.patch(i, { buttonUrl: v })} />
          </div>
        </ItemShell>
      ))}
      <button type="button" onClick={ops.add} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <Plus size={15} /> Add slide
      </button>
    </div>
  );
}

export function NewsContentEditor({
  items,
  setItems,
}: {
  items: NewsItem[];
  setItems: (v: NewsItem[]) => void;
}) {
  const ops = useListOps<NewsItem>(items, setItems, {
    title: "",
    date: "",
    imageUrl: "",
    excerpt: "",
    url: "",
    category: "",
  });
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <ItemShell key={i} index={i} count={items.length} onMove={(d) => ops.move(i, d)} onRemove={() => ops.remove(i)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <TextField label="Title" value={it.title} onChange={(v) => ops.patch(i, { title: v })} />
            </div>
            <TextField label="Date" value={it.date} onChange={(v) => ops.patch(i, { date: v })} placeholder="2026-07-20" />
            <TextField label="Category" value={it.category} onChange={(v) => ops.patch(i, { category: v })} />
            <div className="col-span-2">
              <ImageField label="Image" value={it.imageUrl} onChange={(v) => ops.patch(i, { imageUrl: v })} />
            </div>
            <div className="col-span-2">
              <TextField label="Excerpt" value={it.excerpt} onChange={(v) => ops.patch(i, { excerpt: v })} textarea />
            </div>
            <div className="col-span-2">
              <UrlField label="Link URL" value={it.url} onChange={(v) => ops.patch(i, { url: v })} />
            </div>
          </div>
        </ItemShell>
      ))}
      <button type="button" onClick={ops.add} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <Plus size={15} /> Add article
      </button>
    </div>
  );
}
