// Builds the payload served to embeds/preview from a widget row.
import { prisma } from "@/lib/db";
import { resolveContent } from "./resolve-content";
import { getWidgetDef, type DataBinding, type WidgetTypeKey } from "./registry";

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

// Payload from the PUBLISHED snapshot — this is what live embeds render.
export async function getPublishedWidget(id: string): Promise<ServedWidget | null> {
  const widget = await prisma.widget.findUnique({ where: { id } });
  if (!widget || widget.status !== "PUBLISHED" || !widget.published) return null;
  const pub = widget.published as PublishedSnapshot;
  const type = widget.type as WidgetTypeKey;
  const def = getWidgetDef(type);
  const settings = def.settingsSchema.parse(pub.settings ?? {}) as Record<string, unknown>;
  const items = await resolveContent({
    type,
    contentSource: pub.contentSource ?? "MANUAL",
    manualItems: pub.items,
    dataSourceId: pub.dataSourceId,
    dataBinding: pub.dataBinding ?? null,
  });
  return { id: widget.id, type, settings, items };
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
  const items = await resolveContent({
    type,
    contentSource: widget.contentSource,
    manualItems: widget.items.map((i) => i.data as Record<string, unknown>),
    dataSourceId: widget.dataSourceId,
    dataBinding: (widget.dataBinding as DataBinding | null) ?? null,
  });
  return { id: widget.id, type, settings, items };
}
