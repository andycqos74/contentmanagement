import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import {
  getById,
  removeFixture,
  updateFixture,
  updateLogPages,
  writeUpdateLog,
} from "@/lib/fixtures/repository";
import {
  fixtureInputSchema,
  getContentPool,
  parseId,
  toFixtureInput,
} from "@/lib/fixtures/service";

export const runtime = "nodejs";

// GET a single fixture (with its result) for editing.
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
      { error: `Could not load fixture: ${e instanceof Error ? e.message : "query failed"}` },
      { status: 502 },
    );
  }
}

// PUT: update an existing fixture's details.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { res } = await requireUser();
  if (res) return res;
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const parsed = fixtureInputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const conn = await getContentPool();
  if ("error" in conn) return NextResponse.json({ error: conn.error }, { status: 400 });

  try {
    const fixture = toFixtureInput(parsed.data);
    const found = await updateFixture(conn.pool, id, fixture);
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await writeUpdateLog(conn.pool, updateLogPages(fixture, false));
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json(
      { error: `Save failed: ${e instanceof Error ? e.message : "update failed"}` },
      { status: 502 },
    );
  }
}

// DELETE a fixture (and its result).
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
    const existing = await getById(conn.pool, id);
    await removeFixture(conn.pool, id);
    if (existing) await writeUpdateLog(conn.pool, updateLogPages(existing, true));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: `Delete failed: ${e instanceof Error ? e.message : "delete failed"}` },
      { status: 502 },
    );
  }
}
