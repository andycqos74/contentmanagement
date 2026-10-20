// Resolves a widget's content items to a normalised array, from either
// manually-entered rows or a data-source query. Server-only.
import type { RowDataPacket } from "mysql2";
import { prisma } from "@/lib/db";
import { getPool } from "@/lib/datasource/pool";
import { buildSelect } from "@/lib/datasource/query-builder";
import {
  getWidgetDef,
  type BannerElement,
  type DataBinding,
  type WidgetTypeKey,
} from "@/lib/widgets/registry";
import {
  applyBannerRow,
  bannerBoundColumns,
  bannerQueryBinding,
  isBannerBindingComplete,
  type BannerRow,
} from "@/lib/widgets/banner-data";

export type ContentSpec = {
  type: WidgetTypeKey;
  contentSource: "MANUAL" | "DATA";
  manualItems?: Record<string, unknown>[];
  dataSourceId?: string | null;
  dataBinding?: DataBinding | null;
};

export async function resolveContent(
  spec: ContentSpec,
): Promise<Record<string, unknown>[]> {
  const def = getWidgetDef(spec.type);

  // A banner is always laid out by hand; a database link only swaps the
  // content of bound elements for the values of a single row.
  if (spec.type === "BANNER") {
    const items = (spec.manualItems ?? []).map(
      (it) => def.itemSchema.parse(it ?? {}) as BannerElement,
    );
    let row: BannerRow | null = null;
    try {
      row = await fetchBannerRow(spec.dataSourceId, spec.dataBinding, bannerBoundColumns(items));
    } catch (e) {
      // Never break a live banner over a query error — fall back to static content.
      console.error(`Banner data link failed: ${e instanceof Error ? e.message : e}`);
    }
    return items.map((el) => applyBannerRow(el, row) as Record<string, unknown>);
  }

  if (spec.contentSource === "MANUAL") {
    return (spec.manualItems ?? []).map(
      (it) => def.itemSchema.parse(it ?? {}) as Record<string, unknown>,
    );
  }

  // DATA
  if (!spec.dataSourceId || !spec.dataBinding?.table) return [];
  const ds = await prisma.dataSource.findUnique({
    where: { id: spec.dataSourceId },
  });
  if (!ds) return [];

  const binding = spec.dataBinding;
  const mapped = def.dataFields
    .map((f) => binding.fieldMap[f.key])
    .filter((c): c is string => Boolean(c));
  const columns = Array.from(new Set(mapped));
  if (columns.length === 0) return [];

  const { sql, params } = buildSelect(binding, columns);
  const pool = getPool(ds);
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);

  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const f of def.dataFields) {
      const col = binding.fieldMap[f.key];
      if (col && row[col] != null) obj[f.key] = String(row[col]);
    }
    return def.itemSchema.parse(obj) as Record<string, unknown>;
  });
}

// Fetches the single row a banner is linked to (first row by the mandatory
// sort, after filters), returning the requested columns as strings. Returns
// null when the link is incomplete, nothing is bound, or no row matches.
// Throws on connection / query errors.
export async function fetchBannerRow(
  dataSourceId: string | null | undefined,
  binding: DataBinding | null | undefined,
  columns: string[],
): Promise<BannerRow | null> {
  if (!dataSourceId || !binding || !isBannerBindingComplete(binding) || columns.length === 0) {
    return null;
  }
  const ds = await prisma.dataSource.findUnique({ where: { id: dataSourceId } });
  if (!ds) return null;

  const { sql, params } = buildSelect(bannerQueryBinding(binding), columns);
  const [rows] = await getPool(ds).query<RowDataPacket[]>(sql, params);
  const first = rows[0];
  if (!first) return null;

  const row: BannerRow = {};
  for (const col of columns) if (first[col] != null) row[col] = String(first[col]);
  return row;
}
