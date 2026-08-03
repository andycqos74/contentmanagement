// Single source of truth for widget types: settings + item schemas, defaults,
// and the fields each type exposes for data-source mapping. Imported by the
// admin editor, the render components, the public API, and the seed script.
// Pure zod/types only — safe in both client and server bundles.
import { z } from "zod";

export type WidgetTypeKey = "HERO_SLIDER" | "LATEST_NEWS" | "BANNER" | "COOKIE_CONSENT";

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

/* ------------------------------- Banner ------------------------------- */
// A free-form banner: absolutely-positioned elements on a fixed design canvas
// (width x height) that scales responsively. Each element is one WidgetItem.

const bannerElementBase = {
  id: z.string(),
  x: z.number().default(0),
  y: z.number().default(0),
  w: z.number().default(200),
  h: z.number().default(80),
};

export const bannerTextSchema = z.object({
  ...bannerElementBase,
  type: z.literal("text"),
  text: z.string().default("Text"),
  color: z.string().default("#ffffff"),
  fontSize: z.number().default(32),
  fontWeight: z.enum(["400", "600", "700", "800"]).default("700"),
  align: z.enum(["left", "center", "right"]).default("center"),
  bgColor: z.string().default("#000000"),
  bgOpacity: z.number().min(0).max(1).default(0),
});

export const bannerImageSchema = z.object({
  ...bannerElementBase,
  type: z.literal("image"),
  imageUrl: z.string().default(""),
  fit: z.enum(["cover", "contain"]).default("cover"),
  rounded: z.number().default(0),
});

export const bannerButtonSchema = z.object({
  ...bannerElementBase,
  type: z.literal("button"),
  text: z.string().default("Button"),
  url: z.string().default(""),
  bg: z.string().default("#094582"),
  color: z.string().default("#ffffff"),
  fontSize: z.number().default(16),
  rounded: z.number().default(8),
});

export const bannerElementSchema = z.discriminatedUnion("type", [
  bannerTextSchema,
  bannerImageSchema,
  bannerButtonSchema,
]);
export type BannerElement = z.infer<typeof bannerElementSchema>;
export type BannerElementType = BannerElement["type"];

export const bannerSettingsSchema = z.object({
  widthMode: z.enum(["full", "fixed"]).default("full"),
  width: z.number().int().min(320).max(2000).default(1200), // design width (= max width when fixed)
  height: z.number().int().min(80).max(1200).default(360),
  bgColor: z.string().default("#0b3f70"),
  bgImage: z.string().default(""),
  bgFit: z.enum(["cover", "contain", "tile"]).default("cover"),
  bgTileSize: z.number().int().min(0).max(1000).default(0),
  overlayOpacity: z.number().min(0).max(1).default(0),
  rounded: z.number().int().min(0).max(64).default(0),
});
export type BannerSettings = z.infer<typeof bannerSettingsSchema>;

/* --------------------------- Cookie consent --------------------------- */

export const cookieCategorySchema = z.object({
  key: z.string(),
  label: z.string().default("Category"),
  description: z.string().default(""),
  required: z.boolean().default(false),
});
export type CookieCategory = z.infer<typeof cookieCategorySchema>;

export const cookieConsentSettingsSchema = z.object({
  position: z.enum(["bottom", "top", "bottom-left", "bottom-right"]).default("bottom"),
  layout: z.enum(["bar", "box"]).default("bar"),
  title: z.string().default("We value your privacy"),
  message: z
    .string()
    .default(
      "We use cookies to improve your experience, analyse traffic and personalise content. You can accept all, reject non-essential cookies, or manage your preferences.",
    ),
  policyText: z.string().default("Cookie Policy"),
  policyUrl: z.string().default(""),
  acceptText: z.string().default("Accept all"),
  rejectText: z.string().default("Reject all"),
  customizeText: z.string().default("Manage preferences"),
  saveText: z.string().default("Save preferences"),
  showReject: z.boolean().default(true),
  showCustomize: z.boolean().default(true),
  showReopen: z.boolean().default(true),
  reopenText: z.string().default("Cookie settings"),
  categories: z.array(cookieCategorySchema).default([
    {
      key: "necessary",
      label: "Strictly necessary",
      description: "Required for the site to work. Always active.",
      required: true,
    },
    {
      key: "analytics",
      label: "Analytics",
      description: "Help us understand how visitors use the site.",
      required: false,
    },
    {
      key: "marketing",
      label: "Marketing",
      description: "Used to deliver relevant advertising.",
      required: false,
    },
  ]),
  bgColor: z.string().default("#ffffff"),
  textColor: z.string().default("#1e293b"),
  accentColor: z.string().default("#094582"),
  buttonTextColor: z.string().default("#ffffff"),
  rounded: z.number().int().min(0).max(32).default(12),
  version: z.string().default("1"),
});
export type CookieConsentSettings = z.infer<typeof cookieConsentSettingsSchema>;

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
  BANNER: {
    key: "BANNER",
    label: "Banner",
    description: "A free-form banner — position images, text and buttons on a canvas.",
    settingsSchema: bannerSettingsSchema,
    itemSchema: bannerElementSchema,
    defaultSettings: bannerSettingsSchema.parse({}),
    defaultItem: bannerTextSchema.parse({
      id: "t1",
      type: "text",
      x: 64,
      y: 130,
      w: 560,
      h: 100,
      text: "Your banner headline",
      fontSize: 46,
      fontWeight: "800",
      align: "left",
    }),
    dataFields: [],
  },
  COOKIE_CONSENT: {
    key: "COOKIE_CONSENT",
    label: "Cookie Consent",
    description: "A GDPR-style cookie consent bar with granular, opt-in categories.",
    settingsSchema: cookieConsentSettingsSchema,
    itemSchema: z.record(z.string(), z.unknown()),
    defaultSettings: cookieConsentSettingsSchema.parse({}),
    defaultItem: {},
    dataFields: [],
  },
};

export const WIDGET_LIST = Object.values(WIDGETS);

export function getWidgetDef(type: WidgetTypeKey): WidgetDef {
  return WIDGETS[type];
}
