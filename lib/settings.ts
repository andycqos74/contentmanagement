// Global key/value app settings, backed by the AppSetting table. Small config
// that isn't tied to a single widget — currently just which external DataSource
// is the "content" database that the News admin (and future ported qos-admin
// pages) read from and write to.
import { prisma } from "@/lib/db";
import type { DataSourceRecord } from "@/lib/datasource/pool";

// Setting key: id of the DataSource pointing at the external content DB
// (news_items, news_categories, staff, fixtures, update_log, …).
export const CONTENT_DATASOURCE_KEY = "contentDataSourceId";

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// Resolve the configured content-DB DataSource row (with the encrypted password,
// ready for getPool). Returns null when unset or the referenced source is gone.
export async function getContentDataSource(): Promise<DataSourceRecord | null> {
  const id = await getSetting(CONTENT_DATASOURCE_KEY);
  if (!id) return null;
  const ds = await prisma.dataSource.findUnique({ where: { id } });
  if (!ds) return null;
  return {
    id: ds.id,
    host: ds.host,
    port: ds.port,
    database: ds.database,
    username: ds.username,
    passwordEnc: ds.passwordEnc,
    ssl: ds.ssl,
  };
}
