import type { WidgetTypeKey } from "@/lib/widgets/registry";

export type ColorToken = { text: string; bg: string; border: string };

const FALLBACK: ColorToken = { text: "#475467", bg: "#F2F4F7", border: "#D0D5DD" };

const WIDGET_COLORS: Record<WidgetTypeKey, ColorToken> = {
  HERO_SLIDER:    { text: "#5925DC", bg: "#F4F3FF", border: "#D9D6FE" },
  LATEST_NEWS:    { text: "#0A4B93", bg: "#EEF4FB", border: "#C7DAF0" },
  BANNER:         { text: "#C4320A", bg: "#FFF4ED", border: "#F9DBAF" },
  COOKIE_CONSENT: { text: "#475467", bg: "#F2F4F7", border: "#D0D5DD" },
  GALLERY:        { text: "#0E7090", bg: "#ECFDFF", border: "#A5F0FC" },
  GALLERY_BROWSER:{ text: "#0E7090", bg: "#ECFDFF", border: "#A5F0FC" },
  SLIDER:         { text: "#A15C07", bg: "#FFFAEB", border: "#FEDF89" },
};

const CATEGORY_COLORS: Record<string, ColorToken> = {
  "Match Report": { text: "#0A4B93", bg: "#EEF4FB", border: "#C7DAF0" },
  "Team News":    { text: "#0E7090", bg: "#ECFDFF", border: "#A5F0FC" },
  "Club":         { text: "#5925DC", bg: "#F4F3FF", border: "#D9D6FE" },
  "Academy":      { text: "#067647", bg: "#ECFDF3", border: "#ABEFC6" },
  "Tickets":      { text: "#C4320A", bg: "#FFF4ED", border: "#F9DBAF" },
};

export function widgetColor(type: WidgetTypeKey): ColorToken {
  return WIDGET_COLORS[type] ?? FALLBACK;
}

export function categoryColor(category: string | null | undefined): ColorToken {
  if (!category) return FALLBACK;
  return CATEGORY_COLORS[category] ?? FALLBACK;
}

// Stable per-competition hue (competition IDs come from the content DB, so we
// cycle a fixed palette rather than naming them).
const COMPETITION_PALETTE: ColorToken[] = [
  { text: "#0A4B93", bg: "#EEF4FB", border: "#C7DAF0" },
  { text: "#067647", bg: "#ECFDF3", border: "#ABEFC6" },
  { text: "#5925DC", bg: "#F4F3FF", border: "#D9D6FE" },
  { text: "#C4320A", bg: "#FFF4ED", border: "#F9DBAF" },
  { text: "#0E7090", bg: "#ECFDFF", border: "#A5F0FC" },
  { text: "#A15C07", bg: "#FFFAEB", border: "#FEDF89" },
  { text: "#C11574", bg: "#FDF2FA", border: "#FCCEEE" },
];

export function competitionColor(id: number | null | undefined): ColorToken {
  if (!id || id < 0) return FALLBACK;
  return COMPETITION_PALETTE[id % COMPETITION_PALETTE.length];
}
