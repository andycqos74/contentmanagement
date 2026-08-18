// Builds the payload served to embeds/preview from a widget row.
import { prisma } from "@/lib/db";
import {
  listFolderImages,
  listSubfolders,
  rewritePublicUrls,
  type GallerySort,
} from "@/lib/storage";
import { resolveContent } from "./resolve-content";
import {
  galleryBrowserSettingsSchema,
  getWidgetDef,
  type DataBinding,
  type WidgetTypeKey,
} from "./registry";

// A folder-linked gallery lists its CDN folder live, so newly-added images show
// up automatically. Returns items shaped like manual gallery items.
async function galleryFolderItems(
  settings: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const folder = typeof settings.folder === "string" ? settings.folder : "";
  const sort = (typeof settings.sort === "string" ? settings.sort : "name-asc") as GallerySort;
  const limit = typeof settings.limit === "number" ? settings.limit : 0;
  const images = await listFolderImages(folder, sort, limit);
  return images.map((i) => ({ imageUrl: i.imageUrl, caption: i.caption, link: "" }));
}

// A tidy album title from a folder name: turn separators into spaces.
function prettyFolderName(name: string): string {
  return name.replace(/[-_]+/g, " ").trim() || name;
}

// Apply a saved manual order (a list of image filenames) to a folder's images:
// known files first in the saved sequence, any others (e.g. newly-uploaded)
// appended in their existing (sorted) order.
function applyImageOrder<T extends { name: string }>(all: T[], order: string[]): T[] {
  if (!order.length) return all;
  const rank = new Map(order.map((n, i) => [n, i]));
  const known = all.filter((i) => rank.has(i.name)).sort((a, b) => rank.get(a.name)! - rank.get(b.name)!);
  const rest = all.filter((i) => !rank.has(i.name));
  return [...known, ...rest];
}

// A gallery browser lists the sub-folders of its parent folder as albums. Each
// album carries its own images inline so the rendered widget is self-contained
// (no per-album fetch from inside the embed). Sub-folders are discovered live, so
// new albums appear automatically; per-folder display/title come from settings.
export async function galleryBrowserAlbums(
  rawSettings: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const settings = galleryBrowserSettingsSchema.parse(rawSettings ?? {});
  if (!settings.folder) return [];

  const dirs = await listSubfolders(settings.folder);
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  const orderRank = new Map(settings.order.map((p, i) => [p, i]));
  const sorted = [...dirs].sort((a, b) => {
    if (settings.albumSort === "custom") {
      // Known (manually-arranged) folders first, in saved order; the rest by name.
      const ia = orderRank.has(a.path) ? orderRank.get(a.path)! : Infinity;
      const ib = orderRank.has(b.path) ? orderRank.get(b.path)! : Infinity;
      if (ia !== ib) return ia - ib;
      return byName(a, b);
    }
    if (settings.albumSort === "newest" || settings.albumSort === "oldest") {
      const am = a.modified ?? 0;
      const bm = b.modified ?? 0;
      if (am !== bm) return settings.albumSort === "newest" ? bm - am : am - bm;
    }
    const cmp = byName(a, b);
    return settings.albumSort === "name-desc" ? -cmp : cmp;
  });

  const visible = sorted.filter((d) => settings.overrides[d.path]?.display !== false);

  const albums = await Promise.all(
    visible.map(async (d) => {
      const all = applyImageOrder(
        await listFolderImages(d.path, settings.imageSort, 0),
        settings.imageOrder[d.path] ?? [],
      );
      const images = settings.imageLimit > 0 ? all.slice(0, settings.imageLimit) : all;
      const override = settings.overrides[d.path];
      const title = override?.title?.trim() || prettyFolderName(d.name);
      return {
        path: d.path,
        title,
        cover: all[0]?.imageUrl ?? "",
        count: all.length,
        images: images.map((i) => ({ imageUrl: i.imageUrl, caption: i.caption, link: "" })),
      };
    }),
  );
  // Drop empty albums — a folder with no images has nothing to browse.
  return albums.filter((a) => a.count > 0);
}

// Settings as shipped to the (public) renderer. A gallery browser's per-folder
// overrides are applied server-side during resolution, so they're stripped here
// — a hidden album's folder path must not leak into the embed payload.
function publicSettings(
  type: WidgetTypeKey,
  settings: Record<string, unknown>,
): Record<string, unknown> {
  if (type === "GALLERY_BROWSER") {
    // overrides / order / imageOrder are applied server-side during resolution.
    const { overrides: _o, order: _r, imageOrder: _i, ...rest } = settings;
    void _o;
    void _r;
    void _i;
    return rest;
  }
  return settings;
}

export type ServedWidget = {
  id: string;
  type: WidgetTypeKey;
  settings: Record<string, unknown>;
  items: Record<string, unknown>[];
};

type PublishedSnapshot = {
  settings?: unknown;
  contentSource?: "MANUAL" | "DATA";
  dataSourceId?: string | null;
  dataBinding?: DataBinding | null;
  items?: Record<string, unknown>[];
};

// Drop author-hidden content so it is never shipped to live embeds — not just
// visually skipped, but absent from the payload entirely. Banner elements and
// slider slides (and hidden elements within visible slides) are removed.
function stripHidden(
  type: WidgetTypeKey,
  items: Record<string, unknown>[],
): Record<string, unknown>[] {
  if (type === "BANNER") return items.filter((it) => !it.hidden);
  if (type === "SLIDER") {
    return items
      .filter((it) => !it.hidden)
      .map((slide) => {
        const els = slide.elements;
        return Array.isArray(els)
          ? { ...slide, elements: els.filter((el) => !(el as Record<string, unknown>)?.hidden) }
          : slide;
      });
  }
  return items;
}

// Payload from the PUBLISHED snapshot — this is what live embeds render.
export async function getPublishedWidget(id: string): Promise<ServedWidget | null> {
  const widget = await prisma.widget.findUnique({ where: { id } });
  if (!widget || widget.status !== "PUBLISHED" || !widget.published) return null;
  const pub = widget.published as PublishedSnapshot;
  const type = widget.type as WidgetTypeKey;
  const def = getWidgetDef(type);
  const settings = def.settingsSchema.parse(pub.settings ?? {}) as Record<string, unknown>;
  const items =
    type === "GALLERY_BROWSER"
      ? await galleryBrowserAlbums(settings)
      : type === "GALLERY" && settings.source === "folder"
        ? await galleryFolderItems(settings)
        : await resolveContent({
            type,
            contentSource: pub.contentSource ?? "MANUAL",
            manualItems: pub.items,
            dataSourceId: pub.dataSourceId,
            dataBinding: pub.dataBinding ?? null,
          });
  return {
    id: widget.id,
    type,
    settings: rewritePublicUrls(publicSettings(type, settings)),
    items: rewritePublicUrls(stripHidden(type, items)),
  };
}

// Payload from the DRAFT/working state — used only by auth-gated preview.
export async function getDraftWidget(id: string): Promise<ServedWidget | null> {
  const widget = await prisma.widget.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!widget) return null;
  const type = widget.type as WidgetTypeKey;
  const def = getWidgetDef(type);
  const settings = def.settingsSchema.parse(widget.settings ?? {}) as Record<string, unknown>;
  const items =
    type === "GALLERY_BROWSER"
      ? await galleryBrowserAlbums(settings)
      : type === "GALLERY" && settings.source === "folder"
        ? await galleryFolderItems(settings)
        : await resolveContent({
            type,
            contentSource: widget.contentSource,
            manualItems: widget.items.map((i) => i.data as Record<string, unknown>),
            dataSourceId: widget.dataSourceId,
            dataBinding: (widget.dataBinding as DataBinding | null) ?? null,
          });
  return {
    id: widget.id,
    type,
    settings: rewritePublicUrls(publicSettings(type, settings)),
    items: rewritePublicUrls(stripHidden(type, items)),
  };
}
