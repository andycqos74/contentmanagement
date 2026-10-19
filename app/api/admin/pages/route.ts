import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { getContentPool } from "@/lib/news/service";
import { newPageSchema } from "@/lib/pages/input";
import { getList, insert } from "@/lib/pages/repository";

export const runtime = "nodejs";

export async function GET() {
  const { res } = await requireUser();
  if (res) return res;
  const conn = await getContentPool();
  if ("error" in conn) return NextResponse.json({ error: conn.error }, { status: 400 });
  try {
    return NextResponse.json({ pages: await getList(conn.pool) });
  } catch (e) {
    return NextResponse.json({ error: `Could not read pages: ${e instanceof Error ? e.message : "query failed"}` }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const { res } = await requireUser();
  if (res) return res;
  const parsed = newPageSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const conn = await getContentPool();
  if ("error" in conn) return NextResponse.json({ error: conn.error }, { status: 400 });
  try {
    const id = await insert(conn.pool, parsed.data.shortName, parsed.data.title, parsed.data.content);
    if (id === null) {
      return NextResponse.json({ error: `A page named "${parsed.data.shortName}" already exists` }, { status: 409 });
    }
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: `Save failed: ${e instanceof Error ? e.message : "insert failed"}` }, { status: 502 });
  }
}
