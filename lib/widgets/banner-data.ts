// Banner ↔ database link. A banner can be linked to one row of a table/view
// (widget-level binding: table, filters, a mandatory sort, LIMIT 1); individual
// elements then bind a column to their content. Pure helpers, client-safe.
import type { BannerElement, DataBinding } from "./registry";

export type BannerRow = Record<string, string>;

// A banner binding is usable only once a table and a sort column are chosen —
// without a sort, "the first row" would be arbitrary.
export function isBannerBindingComplete(binding: DataBinding | null | undefined): boolean {
  return Boolean(binding?.table && binding.orderBy?.column);
}

// The binding actually queried for a banner: always a single row.
export function bannerQueryBinding(binding: DataBinding): DataBinding {
  return { ...binding, limit: 1 };
}

// Distinct columns referenced by the banner's elements.
export function bannerBoundColumns(items: BannerElement[]): string[] {
  const cols = new Set<string>();
  for (const el of items) {
    if (el.dataField) cols.add(el.dataField);
    if (el.type === "button" && el.urlField) cols.add(el.urlField);
  }
  return [...cols];
}

// Substitute an element's bound content with the row's values. Columns that are
// missing or NULL keep the element's static value as a fallback.
export function applyBannerRow(el: BannerElement, row: BannerRow | null | undefined): BannerElement {
  if (!row) return el;
  const val = (col: string | undefined) => (col && row[col] != null ? row[col] : undefined);
  const main = val(el.dataField);
  switch (el.type) {
    case "text":
      return main !== undefined ? { ...el, text: main } : el;
    case "image":
      return main !== undefined ? { ...el, imageUrl: main } : el;
    case "button": {
      const url = val(el.urlField);
      return {
        ...el,
        ...(main !== undefined ? { text: main } : {}),
        ...(url !== undefined ? { url } : {}),
      };
    }
    default:
      return el;
  }
}
