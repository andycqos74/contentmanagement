import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { getById, remove, update, writeUpdateLog } from "@/lib/news/repository";
import { getContentPool, newsInputSchema, toNewsItem } from "@/lib/news/service";

export const runtime = "nodejs";

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// GET a single news item for editing.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { res } = await requireUser();
  if (res) return res;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const conn = await getContentPool();
  if ("error" in conn) return NextResponse.json({ error: conn.error }, { status: 400 });

  try {
    const item = await getById(conn.pool, id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json(
      { error: `Could not load item: ${e instanceof Error ? e.message : "query failed"}` },
      { status: 502 },
    );
  }
}

// PUT: update an existing news item.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { res } = await requireUser();
  if (res) return res;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

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
    const item = toNewsItem(parsed.data, id);
    await update(conn.pool, item);
    await writeUpdateLog(conn.pool, item.CategoryID, item.PublishDate);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json(
      { error: `Save failed: ${e instanceof Error ? e.message : "update failed"}` },
      { status: 502 },
    );
  }
}

// DELETE a news item.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { res } = await requireUser();
  if (res) return res;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const conn = await getContentPool();
  if ("error" in conn) return NextResponse.json({ error: conn.error }, { status: 400 });

  try {
    await remove(conn.pool, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: `Delete failed: ${e instanceof Error ? e.message : "delete failed"}` },
      { status: 502 },
    );
  }
}
