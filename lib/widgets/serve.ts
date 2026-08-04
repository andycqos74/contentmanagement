// Builds the payload served to embeds/preview from a widget row.
import { prisma } from "@/lib/db";
import { listFolderImages, rewritePublicUrls, type GallerySort } from "@/lib/storage";
import { resolveContent } from "./resolve-content";
import { getWidgetDef, type DataBinding, type WidgetTypeKey } from "./registry";

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
    type === "GALLERY" && settings.source === "folder"
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
    settings: rewritePublicUrls(settings),
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
    type === "GALLERY" && settings.source === "folder"
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
    settings: rewritePublicUrls(settings),
    items: rewritePublicUrls(stripHidden(type, items)),
  };
}
