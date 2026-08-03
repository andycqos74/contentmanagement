// Curated font choices offered by the font selector on every widget. Each entry
// is a self-contained CSS font stack; Google-hosted families also carry the
// `google` query so the render surfaces (embed iframe, admin preview, consent
// loader) can pull the webfont on demand. Pure data + DOM helper — safe to
// import from both server and client bundles.

export type FontDef = { id: string; label: string; stack: string; google?: string };

export const FONTS: FontDef[] = [
  {
    id: "system",
    label: "System default",
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  { id: "inter", label: "Inter", stack: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;500;600;700;800" },
  { id: "roboto", label: "Roboto", stack: "'Roboto', system-ui, sans-serif", google: "Roboto:wght@400;500;700;900" },
  {
    id: "opensans",
    label: "Open Sans",
    stack: "'Open Sans', system-ui, sans-serif",
    google: "Open+Sans:wght@400;500;600;700;800",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    stack: "'Montserrat', system-ui, sans-serif",
    google: "Montserrat:wght@400;500;600;700;800",
  },
  { id: "poppins", label: "Poppins", stack: "'Poppins', system-ui, sans-serif", google: "Poppins:wght@400;500;600;700;800" },
  { id: "oswald", label: "Oswald", stack: "'Oswald', system-ui, sans-serif", google: "Oswald:wght@400;500;600;700" },
  { id: "lato", label: "Lato", stack: "'Lato', system-ui, sans-serif", google: "Lato:wght@400;700;900" },
  { id: "raleway", label: "Raleway", stack: "'Raleway', system-ui, sans-serif", google: "Raleway:wght@400;500;600;700;800" },
  {
    id: "playfair",
    label: "Playfair Display",
    stack: "'Playfair Display', Georgia, serif",
    google: "Playfair+Display:wght@400;500;600;700;800",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    stack: "'Merriweather', Georgia, serif",
    google: "Merriweather:wght@400;700;900",
  },
  { id: "lora", label: "Lora", stack: "'Lora', Georgia, serif", google: "Lora:wght@400;500;600;700" },
];

const FONT_MAP: Record<string, FontDef> = Object.fromEntries(FONTS.map((f) => [f.id, f]));

export const FONT_OPTIONS = FONTS.map((f) => ({ value: f.id, label: f.label }));

export function fontDef(id?: string | null): FontDef {
  return (id && FONT_MAP[id]) || FONTS[0];
}

export function fontStack(id?: string | null): string {
  return fontDef(id).stack;
}

export function googleFontHref(id?: string | null): string | null {
  const f = fontDef(id);
  return f.google ? `https://fonts.googleapis.com/css2?family=${f.google}&display=swap` : null;
}

// Client-only: make sure the chosen Google font is loaded in the current
// document (no-op for system fonts or on the server). Deduplicated by font id.
export function ensureFontLoaded(id?: string | null): void {
  if (typeof document === "undefined") return;
  const href = googleFontHref(id);
  if (!href) return;
  const domId = "cms-font-" + fontDef(id).id;
  if (document.getElementById(domId)) return;
  const link = document.createElement("link");
  link.id = domId;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}
