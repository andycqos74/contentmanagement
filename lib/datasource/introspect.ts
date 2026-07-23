// Schema introspection so the admin can pick a table and map columns
// without writing SQL.
import type { RowDataPacket } from "mysql2";
import { getPool, type DataSourceRecord } from "./pool";

export async function listTables(ds: DataSourceRecord): Promise<string[]> {
  const pool = getPool(ds);
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name",
    [ds.database],
  );
  return rows.map((r) => String(r.t));
}

export async function listColumns(
  ds: DataSourceRecord,
  table: string,
): Promise<{ name: string; type: string }[]> {
  const pool = getPool(ds);
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT column_name AS n, data_type AS d FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position",
    [ds.database, table],
  );
  return rows.map((r) => ({ name: String(r.n), type: String(r.d) }));
}
