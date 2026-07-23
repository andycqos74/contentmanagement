// Read-only connection pools for external data sources (the website DB).
import mysql, { type Pool } from "mysql2/promise";
import { decryptSecret } from "@/lib/crypto";

export type DataSourceRecord = {
  id: string;
  host: string;
  port: number;
  database: string;
  username: string;
  passwordEnc: string;
  ssl: boolean;
};

const pools = new Map<string, Pool>();

export function getPool(ds: DataSourceRecord): Pool {
  const existing = pools.get(ds.id);
  if (existing) return existing;
  const pool = mysql.createPool({
    host: ds.host,
    port: ds.port,
    user: ds.username,
    password: decryptSecret(ds.passwordEnc),
    database: ds.database,
    ssl: ds.ssl ? {} : undefined,
    connectionLimit: 4,
    waitForConnections: true,
    connectTimeout: 8000,
    multipleStatements: false, // hard block on stacked statements
    dateStrings: true, // DATE/DATETIME come back as strings -> clean JSON
  });
  pools.set(ds.id, pool);
  return pool;
}

export function invalidatePool(id: string) {
  const p = pools.get(id);
  if (p) {
    p.end().catch(() => {});
    pools.delete(id);
  }
}

// Ad-hoc connection used only to validate credentials from the admin UI.
export async function testConnection(cfg: {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  let conn: mysql.Connection | undefined;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.username,
      password: cfg.password,
      database: cfg.database,
      ssl: cfg.ssl ? {} : undefined,
      connectTimeout: 8000,
      multipleStatements: false,
    });
    await conn.query("SELECT 1");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Connection failed" };
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
