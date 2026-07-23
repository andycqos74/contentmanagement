// Single source of truth for widget types: settings + item schemas, defaults,
// and the fields each type exposes for data-source mapping. Imported by the
// admin editor, the render components, the public API, and the seed script.
// Pure zod/types only — safe in both client and server bundles.
import { z } from "zod";

export type WidgetTypeKey = "HERO_SLIDER" | "LATEST_NEWS";

/* ----------------------------- Hero Slider ----------------------------- */

export const heroSlideSchema = z.object({
  imageUrl: z.string().default(""),
  heading: z.string().default(""),
  subheading: z.string().default(""),
  buttonText: z.string().default(""),
  buttonUrl: z.string().default(""),
  textColor: z.string().default("#ffffff"),
});
export type HeroSlide = z.infer<typeof heroSlideSchema>;

export const heroSettingsSchema = z.object({
  height: z.number().int().min(120).max(1200).default(440),
  fullWidth: z.boolean().default(true),
  autoplay: z.boolean().default(true),
  intervalMs: z.number().int().min(1000).max(20000).default(5000),
  transition: z.enum(["slide", "fade"]).default("slide"),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(true),
  overlayOpacity: z.number().min(0).max(1).default(0.35),
  textPosition: z.enum(["left", "center", "right"]).default("center"),
  rounded: z.number().int().min(0).max(48).default(12),
  accentColor: z.string().default("#094582"),
});
export type HeroSettings = z.infer<typeof heroSettingsSchema>;

/* ----------------------------- Latest News ----------------------------- */

export const newsItemSchema = z.object({
  title: z.string().default(""),
  date: z.string().default(""),
  imageUrl: z.string().default(""),
  excerpt: z.string().default(""),
  url: z.string().default(""),
  category: z.string().default(""),
});
export type NewsItem = z.infer<typeof newsItemSchema>;

export const newsSettingsSchema = z.object({
  layout: z.enum(["grid", "list", "carousel"]).default("grid"),
  columns: z.number().int().min(1).max(4).default(3),
  limit: z.number().int().min(1).max(24).default(6),
  showImage: z.boolean().default(true),
  showDate: z.boolean().default(true),
  showCategory: z.boolean().default(true),
  showExcerpt: z.boolean().default(true),
  excerptLength: z.number().int().min(0).max(400).default(140),
  readMoreText: z.string().default("Read more"),
  dateFormat: z.enum(["DD/MM/YYYY", "MMM D, YYYY", "relative"]).default("DD/MM/YYYY"),
  accentColor: z.string().default("#094582"),
  cardStyle: z.enum(["shadow", "border", "flat"]).default("shadow"),
});
export type NewsSettings = z.infer<typeof newsSettingsSchema>;

/* --------------------------- Data binding ----------------------------- */

export const FILTER_OPS = ["=", "!=", ">", ">=", "<", "<=", "LIKE"] as const;

export const dataBindingSchema = z.object({
  table: z.string().default(""),
  fieldMap: z.record(z.string(), z.string()).default({}),
  filters: z
    .array(
      z.object({
        column: z.string(),
        op: z.enum(FILTER_OPS),
        value: z.string(),
      }),
    )
    .default([]),
  orderBy: z
    .object({ column: z.string(), dir: z.enum(["ASC", "DESC"]) })
    .nullable()
    .default(null),
  limit: z.number().int().min(1).max(100).default(12),
});
export type DataBinding = z.infer<typeof dataBindingSchema>;

/* ----------------------------- Registry ------------------------------- */

export type DataField = { key: string; label: string; required?: boolean };

export type WidgetDef = {
  key: WidgetTypeKey;
  label: string;
  description: string;
  settingsSchema: z.ZodTypeAny;
  itemSchema: z.ZodTypeAny;
  defaultSettings: Record<string, unknown>;
  defaultItem: Record<string, unknown>;
  dataFields: DataField[];
};

export const WIDGETS: Record<WidgetTypeKey, WidgetDef> = {
  HERO_SLIDER: {
    key: "HERO_SLIDER",
    label: "Hero Slider",
    description: "A full-width image/content carousel for the top of a page.",
    settingsSchema: heroSettingsSchema,
    itemSchema: heroSlideSchema,
    defaultSettings: heroSettingsSchema.parse({}),
    defaultItem: heroSlideSchema.parse({}),
    dataFields: [
      { key: "imageUrl", label: "Image URL", required: true },
      { key: "heading", label: "Heading" },
      { key: "subheading", label: "Subheading" },
      { key: "buttonText", label: "Button text" },
      { key: "buttonUrl", label: "Button URL" },
    ],
  },
  LATEST_NEWS: {
    key: "LATEST_NEWS",
    label: "Latest News",
    description: "A responsive grid, list or carousel of news articles.",
    settingsSchema: newsSettingsSchema,
    itemSchema: newsItemSchema,
    defaultSettings: newsSettingsSchema.parse({}),
    defaultItem: newsItemSchema.parse({}),
    dataFields: [
      { key: "title", label: "Title", required: true },
      { key: "date", label: "Date" },
      { key: "imageUrl", label: "Image URL" },
      { key: "excerpt", label: "Excerpt" },
      { key: "url", label: "Link URL" },
      { key: "category", label: "Category" },
    ],
  },
};

export const WIDGET_LIST = Object.values(WIDGETS);

export function getWidgetDef(type: WidgetTypeKey): WidgetDef {
  return WIDGETS[type];
}
