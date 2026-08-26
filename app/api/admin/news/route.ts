import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { CONTENT_DATASOURCE_KEY, getSetting } from "@/lib/settings";
import {
  getCategories,
  getFixtures,
  getList,
  getStaff,
  insert,
  writeUpdateLog,
} from "@/lib/news/repository";
import { getContentPool, newsInputSchema, toNewsItem } from "@/lib/news/service";

export const runtime = "nodejs";

// The data sources the admin can point News at (no secrets).
async function listDataSources() {
  return prisma.dataSource.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, host: true, database: true },
  });
}

// GET: everything the News page needs — which content DB is selected, the list
// of available data sources, and (when configured) the news list + lookups.
export async function GET() {
  const { res } = await requireUser();
  if (res) return res;

  const [dataSources, contentDataSourceId] = await Promise.all([
    listDataSources(),
    getSetting(CONTENT_DATASOURCE_KEY),
  ]);

  const conn = await getContentPool();
  if ("error" in conn) {
    return NextResponse.json({
      configured: false,
      contentDataSourceId,
      dataSources,
      error: conn.error,
    });
  }
  const { pool } = conn;

  try {
    const [list, categories, staff, fixtures] = await Promise.all([
      getList(pool),
      getCategories(pool),
      getStaff(pool),
      getFixtures(pool),
    ]);
    return NextResponse.json({
      configured: true,
      contentDataSourceId,
      dataSources,
      list,
      categories,
      staff,
      fixtures,
    });
  } catch (e) {
    return NextResponse.json(
      {
        configured: true,
        contentDataSourceId,
        dataSources,
        error: `Could not read the content database: ${e instanceof Error ? e.message : "query failed"}`,
      },
      { status: 502 },
    );
  }
}

// POST: create a news item.
export async function POST(req: Request) {
  const { res } = await requireUser();
  if (res) return res;

  const parsed = newsInputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const conn = await getContentPool();
  if ("error" in conn) return NextResponse.json({ error: conn.error }, { status: 400 });

  try {
    const item = toNewsItem(parsed.data);
    const id = await insert(conn.pool, item);
    await writeUpdateLog(conn.pool, item.CategoryID, item.PublishDate);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: `Save failed: ${e instanceof Error ? e.message : "insert failed"}` },
      { status: 502 },
    );
  }
}
