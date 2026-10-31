import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import {
  clearResult,
  saveResult,
  updateLogPages,
  writeUpdateLog,
} from "@/lib/fixtures/repository";
import {
  getContentPool,
  parseId,
  resultInputSchema,
  toResultInput,
} from "@/lib/fixtures/service";

export const runtime = "nodejs";

// PUT: enter or correct the final score + crowd (or mark postponed).
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { res } = await requireUser();
  if (res) return res;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const parsed = resultInputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const conn = await getContentPool();
  if ("error" in conn) return NextResponse.json({ error: conn.error }, { status: 400 });

  try {
    const fixture = await saveResult(conn.pool, id, toResultInput(parsed.data));
    if (!fixture) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await writeUpdateLog(conn.pool, updateLogPages(fixture, true));
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json(
      { error: `Save failed: ${e instanceof Error ? e.message : "update failed"}` },
      { status: 502 },
    );
  }
}

// DELETE: remove the result so the fixture shows as unplayed again.
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
    const fixture = await clearResult(conn.pool, id);
    if (!fixture) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await writeUpdateLog(conn.pool, updateLogPages(fixture, true));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: `Clear failed: ${e instanceof Error ? e.message : "delete failed"}` },
      { status: 502 },
    );
  }
}
