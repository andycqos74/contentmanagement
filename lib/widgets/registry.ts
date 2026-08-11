// Single source of truth for widget types: settings + item schemas, defaults,
// and the fields each type exposes for data-source mapping. Imported by the
// admin editor, the render components, the public API, and the seed script.
// Pure zod/types only — safe in both client and server bundles.
import { z } from "zod";

export type WidgetTypeKey =
  | "HERO_SLIDER"
  | "LATEST_NEWS"
  | "BANNER"
  | "COOKIE_CONSENT"
  | "SLIDER"
  | "GALLERY"
  | "GALLERY_BROWSER";

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
  transition: z.enum(["slide", "fade", "none"]).default("slide"),
  transitionMs: z.number().int().min(0).max(3000).default(700),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(true),
  overlayOpacity: z.number().min(0).max(1).default(0.35),
  textPosition: z.enum(["left", "center", "right"]).default("center"),
  rounded: z.number().int().min(0).max(48).default(12),
  accentColor: z.string().default("#094582"),
  fontFamily: z.string().default("system"),
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
  fontFamily: z.string().default("system"),
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
  hidden: z.boolean().default(false),
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
  rounded: z.number().default(0),
});

export const bannerImageSchema = z.object({
  ...bannerElementBase,
  type: z.literal("image"),
  imageUrl: z.string().default(""),
  fit: z.enum(["cover", "contain"]).default("cover"),
  rounded: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
});

export const bannerShapeSchema = z.object({
  ...bannerElementBase,
  type: z.literal("shape"),
  shape: z.enum(["rectangle", "ellipse", "triangle", "diamond"]).default("rectangle"),
  bgColor: z.string().default("#094582"),
  bgOpacity: z.number().min(0).max(1).default(1),
  rounded: z.number().default(0), // corner radius (rectangle only)
});

export const bannerButtonSchema = z.object({
  ...bannerElementBase,
  type: z.literal("button"),
  text: z.string().default("Button"),
  url: z.string().default(""),
  // Where the link opens: "_blank" = new tab, "_top" = same window (full page).
  // Never the default (which would navigate inside the embed iframe).
  target: z.enum(["_blank", "_top"]).default("_blank"),
  bg: z.string().default("#094582"),
  color: z.string().default("#ffffff"),
  fontSize: z.number().default(16),
  rounded: z.number().default(8),
});

export const bannerElementSchema = z.discriminatedUnion("type", [
  bannerTextSchema,
  bannerImageSchema,
  bannerShapeSchema,
  bannerButtonSchema,
]);
export type BannerElement = z.infer<typeof bannerElementSchema>;
export type BannerElementType = BannerElement["type"];

/* --------------------------- Element presets -------------------------- */
// A preset saves the *styling* of a banner/slider element — size, colours,
// weight, alignment, radius — so a look can be reused across widgets for a
// consistent design. It deliberately excludes id, position (x/y), the hidden
// flag, and content (text/url/imageUrl).

export const PRESET_STYLE_KEYS: Record<BannerElementType, readonly string[]> = {
  text: ["w", "h", "color", "fontSize", "fontWeight", "align", "bgColor", "bgOpacity", "rounded"],
  image: ["w", "h", "fit", "rounded", "opacity"],
  shape: ["w", "h", "shape", "bgColor", "bgOpacity", "rounded"],
  button: ["w", "h", "bg", "color", "fontSize", "rounded"],
};

// Extract the preset-able style fields from an element.
export function presetStyleFromElement(el: BannerElement): Record<string, unknown> {
  const src = el as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of PRESET_STYLE_KEYS[el.type]) if (src[k] !== undefined) out[k] = src[k];
  return out;
}

// Merge a preset's stored style onto an element (only whitelisted keys for its
// type — never id/x/y/hidden/content).
export function applyPresetStyle(
  el: BannerElement,
  data: Record<string, unknown>,
): BannerElement {
  const patch: Record<string, unknown> = {};
  for (const k of PRESET_STYLE_KEYS[el.type]) if (data[k] !== undefined) patch[k] = data[k];
  return { ...el, ...patch } as BannerElement;
}

export const bannerSettingsSchema = z.object({
  widthMode: z.enum(["full", "fixed"]).default("full"),
  width: z.number().int().min(320).max(2000).default(1200), // design width (= max width when fixed)
  height: z.number().int().min(80).max(1200).default(360),
  bgColor: z.string().default("#0b3f70"),
  bgImage: z.string().default(""),
  bgFit: z.enum(["cover", "contain", "tile"]).default("cover"),
  bgTileSize: z.number().int().min(0).max(1000).default(0),
  bgPosX: z.number().min(0).max(100).default(50),
  bgPosY: z.number().min(0).max(100).default(50),
  overlayOpacity: z.number().min(0).max(1).default(0),
  rounded: z.number().int().min(0).max(64).default(0),
  fontFamily: z.string().default("system"),
});
export type BannerSettings = z.infer<typeof bannerSettingsSchema>;

/* ------------------------------- Slider ------------------------------- */
// A slideshow where each slide is a banner-style canvas (background + freely
// placed elements). Each slide is one WidgetItem.

export const sliderSlideSchema = z.object({
  bgColor: z.string().default("#0b3f70"),
  bgImage: z.string().default(""),
  bgFit: z.enum(["cover", "contain", "tile"]).default("cover"),
  bgTileSize: z.number().int().min(0).max(1000).default(0),
  bgPosX: z.number().min(0).max(100).default(50),
  bgPosY: z.number().min(0).max(100).default(50),
  overlayOpacity: z.number().min(0).max(1).default(0),
  hidden: z.boolean().default(false),
  elements: z.array(bannerElementSchema).default([]),
});
export type SliderSlide = z.infer<typeof sliderSlideSchema>;

export const sliderSettingsSchema = z.object({
  widthMode: z.enum(["full", "fixed"]).default("full"),
  width: z.number().int().min(320).max(2000).default(1200),
  height: z.number().int().min(80).max(1200).default(420),
  rounded: z.number().int().min(0).max(64).default(0),
  autoplay: z.boolean().default(true),
  intervalMs: z.number().int().min(1000).max(20000).default(5000),
  transition: z.enum(["slide", "fade", "none"]).default("slide"),
  transitionMs: z.number().int().min(0).max(3000).default(600),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(true),
  fontFamily: z.string().default("system"),
});
export type SliderSettings = z.infer<typeof sliderSettingsSchema>;

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
  fontFamily: z.string().default("system"),
  version: z.string().default("1"),
});
export type CookieConsentSettings = z.infer<typeof cookieConsentSettingsSchema>;

/* ------------------------------ Gallery ------------------------------- */
// A responsive photo gallery. Content is either a manual list of images or a
// live listing of a CDN storage folder (images added to the folder appear
// automatically). The folder path / sort / limit live in settings; manual
// images are stored as WidgetItems.

export const galleryItemSchema = z.object({
  imageUrl: z.string().default(""),
  caption: z.string().default(""),
  link: z.string().default(""),
});
export type GalleryItem = z.infer<typeof galleryItemSchema>;

export const gallerySettingsSchema = z.object({
  source: z.enum(["manual", "folder"]).default("manual"),
  folder: z.string().default(""), // storage folder path (webdav rel path or combined folder id)
  sort: z.enum(["name-asc", "name-desc", "newest", "oldest"]).default("name-asc"),
  limit: z.number().int().min(0).max(300).default(0), // 0 = show all
  layout: z.enum(["grid", "masonry"]).default("grid"),
  columns: z.number().int().min(1).max(6).default(3),
  gap: z.number().int().min(0).max(40).default(8),
  rounded: z.number().int().min(0).max(48).default(8),
  aspect: z.enum(["auto", "square", "4/3", "3/4", "16/9"]).default("square"),
  lightbox: z.boolean().default(true),
  showCaptions: z.boolean().default(false),
});
export type GallerySettings = z.infer<typeof gallerySettingsSchema>;

/* -------------------------- Gallery Browser --------------------------- */
// An album index over a CDN folder. It lists the sub-folders of a chosen parent
// folder as "albums"; each album can be shown or hidden and given a title
// (defaulted from the folder name). The widget renders a grid of album cards and,
// on click, opens that folder's images as a gallery. Albums are discovered live
// at serve time — new sub-folders appear automatically; per-folder display/title
// choices are stored in settings keyed by the sub-folder's path.

export const galleryFolderOverrideSchema = z.object({
  display: z.boolean().default(true),
  title: z.string().default(""),
});
export type GalleryFolderOverride = z.infer<typeof galleryFolderOverrideSchema>;

// One resolved album, as served to the renderer (folder discovered + images listed).
export const galleryAlbumSchema = z.object({
  path: z.string().default(""),
  title: z.string().default(""),
  cover: z.string().default(""),
  count: z.number().int().default(0),
  images: z.array(galleryItemSchema).default([]),
});
export type GalleryAlbum = z.infer<typeof galleryAlbumSchema>;

export const galleryBrowserSettingsSchema = z.object({
  folder: z.string().default(""), // parent folder whose sub-folders become albums
  overrides: z.record(z.string(), galleryFolderOverrideSchema).default({}), // keyed by sub-folder path
  albumSort: z.enum(["name-asc", "name-desc", "newest", "oldest"]).default("name-asc"),
  imageSort: z.enum(["name-asc", "name-desc", "newest", "oldest"]).default("name-asc"),
  imageLimit: z.number().int().min(0).max(500).default(0), // per-album cap (0 = all)
  // Album grid (the cover cards)
  columns: z.number().int().min(1).max(6).default(3),
  gap: z.number().int().min(0).max(40).default(12),
  rounded: z.number().int().min(0).max(48).default(10),
  aspect: z.enum(["auto", "square", "4/3", "3/4", "16/9"]).default("4/3"),
  showTitles: z.boolean().default(true),
  showCount: z.boolean().default(true),
  titleColor: z.string().default("#0f172a"),
  // Album view (the opened folder's gallery)
  galleryColumns: z.number().int().min(1).max(6).default(4),
  galleryGap: z.number().int().min(0).max(40).default(8),
  galleryAspect: z.enum(["auto", "square", "4/3", "3/4", "16/9"]).default("square"),
  lightbox: z.boolean().default(true),
  showCaptions: z.boolean().default(false),
  backLabel: z.string().default("All albums"),
  accentColor: z.string().default("#094582"),
  fontFamily: z.string().default("system"),
});
export type GalleryBrowserSettings = z.infer<typeof galleryBrowserSettingsSchema>;

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
  SLIDER: {
    key: "SLIDER",
    label: "Slider",
    description: "A slideshow of free-placement canvases (background, images, text, buttons).",
    settingsSchema: sliderSettingsSchema,
    itemSchema: sliderSlideSchema,
    defaultSettings: sliderSettingsSchema.parse({}),
    defaultItem: sliderSlideSchema.parse({
      elements: [
        bannerTextSchema.parse({
          id: "t1",
          type: "text",
          x: 64,
          y: 160,
          w: 560,
          h: 100,
          text: "Slide one",
          fontSize: 46,
          fontWeight: "800",
          align: "left",
        }),
      ],
    }),
    dataFields: [],
  },
  GALLERY: {
    key: "GALLERY",
    label: "Photo Gallery",
    description:
      "A responsive image gallery. Add photos, or link a CDN folder that auto-updates as images are added.",
    settingsSchema: gallerySettingsSchema,
    itemSchema: galleryItemSchema,
    defaultSettings: gallerySettingsSchema.parse({}),
    defaultItem: galleryItemSchema.parse({}),
    dataFields: [],
  },
  GALLERY_BROWSER: {
    key: "GALLERY_BROWSER",
    label: "Gallery Browser",
    description:
      "Turn a CDN folder into an album index — its sub-folders become galleries visitors can browse.",
    settingsSchema: galleryBrowserSettingsSchema,
    itemSchema: galleryAlbumSchema,
    defaultSettings: galleryBrowserSettingsSchema.parse({}),
    defaultItem: galleryAlbumSchema.parse({}),
    dataFields: [],
  },
};

export const WIDGET_LIST = Object.values(WIDGETS);

export function getWidgetDef(type: WidgetTypeKey): WidgetDef {
  return WIDGETS[type];
}
