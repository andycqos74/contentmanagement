// Resolves a widget's content items to a normalised array, from either
// manually-entered rows or a data-source query. Server-only.
import type { RowDataPacket } from "mysql2";
import { prisma } from "@/lib/db";
import { getPool } from "@/lib/datasource/pool";
import { buildSelect } from "@/lib/datasource/query-builder";
import {
  getWidgetDef,
  type DataBinding,
  type WidgetTypeKey,
} from "@/lib/widgets/registry";

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
