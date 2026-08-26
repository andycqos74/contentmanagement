import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { CONTENT_DATASOURCE_KEY, setSetting } from "@/lib/settings";

export const runtime = "nodejs";

// PUT: choose which DataSource is the external content DB (news_items etc.).
export async function PUT(req: Request) {
  const { res } = await requireUser();
  if (res) return res;

  const body = await req.json().catch(() => ({}));
  const dataSourceId = String(body.dataSourceId ?? "").trim();
  if (!dataSourceId) {
    return NextResponse.json({ error: "dataSourceId is required" }, { status: 400 });
  }

  const ds = await prisma.dataSource.findUnique({ where: { id: dataSourceId } });
  if (!ds) {
    return NextResponse.json({ error: "Unknown data source" }, { status: 404 });
  }

  await setSetting(CONTENT_DATASOURCE_KEY, dataSourceId);
  return NextResponse.json({ ok: true, contentDataSourceId: dataSourceId });
}
