import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { getContentPool } from "@/lib/news/service";
import { pageInputSchema } from "@/lib/pages/input";
import { getById, update } from "@/lib/pages/repository";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { res } = await requireUser();
  if (res) return res;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const conn = await getContentPool();
  if ("error" in conn) return NextResponse.json({ error: conn.error }, { status: 400 });
  try {
    const page = await getById(conn.pool, id);
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ page });
  } catch (e) {
    return NextResponse.json({ error: `Could not load page: ${e instanceof Error ? e.message : "query failed"}` }, { status: 502 });
  }
}

// Saves go straight to the live cms_pages row.
export async function PUT(req: Request, { params }: Ctx) {
  const { res } = await requireUser();
  if (res) return res;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const parsed = pageInputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const conn = await getContentPool();
  if ("error" in conn) return NextResponse.json({ error: conn.error }, { status: 400 });
  try {
    if (!(await getById(conn.pool, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await update(conn.pool, id, parsed.data.title, parsed.data.content);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: `Save failed: ${e instanceof Error ? e.message : "update failed"}` }, { status: 502 });
  }
}
