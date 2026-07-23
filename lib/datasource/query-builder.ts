// Builds a safe, parameterised read-only SELECT from a widget's data binding.
// Identifiers are strictly whitelisted (never interpolated as free text); all
// values are bound parameters; LIMIT is an integer-validated inline value.
import { FILTER_OPS, type DataBinding } from "@/lib/widgets/registry";

const IDENT = /^[A-Za-z0-9_]{1,64}$/;

function ident(name: string): string {
  if (!IDENT.test(name)) {
    throw new Error(`Invalid SQL identifier: ${JSON.stringify(name)}`);
  }
  return "`" + name + "`";
}

export type BuiltQuery = { sql: string; params: (string | number)[] };

export function buildSelect(binding: DataBinding, columns: string[]): BuiltQuery {
  const table = ident(binding.table);
  const cols = columns.length ? columns.map(ident).join(", ") : "*";
  const params: (string | number)[] = [];
  let sql = `SELECT ${cols} FROM ${table}`;

  const wheres: string[] = [];
  for (const f of binding.filters ?? []) {
    if (!FILTER_OPS.includes(f.op)) throw new Error(`Invalid operator: ${f.op}`);
    wheres.push(`${ident(f.column)} ${f.op} ?`);
    params.push(f.value);
  }
  if (wheres.length) sql += ` WHERE ${wheres.join(" AND ")}`;

  if (binding.orderBy?.column) {
    const dir = binding.orderBy.dir === "ASC" ? "ASC" : "DESC";
    sql += ` ORDER BY ${ident(binding.orderBy.column)} ${dir}`;
  }

  const limit = Number.isInteger(binding.limit)
    ? Math.min(Math.max(binding.limit, 1), 100)
    : 12;
  sql += ` LIMIT ${limit}`;

  return { sql, params };
}
