import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { CONTENT_DATASOURCE_KEY, getSetting } from "@/lib/settings";
import {
  getCurrentSeasonId,
  getList,
  getLookups,
  insertFixture,
  updateLogPages,
  writeUpdateLog,
} from "@/lib/fixtures/repository";
import { fixtureInputSchema, getContentPool, toFixtureInput } from "@/lib/fixtures/service";

export const runtime = "nodejs";

// The data sources the admin can point the content DB at (no secrets).
async function listDataSources() {
  return prisma.dataSource.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, host: true, database: true },
  });
}

// GET: everything the Fixtures page needs — which content DB is selected, the
// available data sources, the lookups, and the fixtures (with any result) for
// the requested season (defaults to the current season).
export async function GET(req: Request) {
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
    const requested = Number(new URL(req.url).searchParams.get("season"));
    const lookups = await getLookups(pool);
    const seasonId =
      Number.isInteger(requested) && requested > 0
        ? requested
        : ((await getCurrentSeasonId(pool)) ?? lookups.seasons.at(-1)?.Id ?? null);
    const list = seasonId ? await getList(pool, seasonId) : [];
    return NextResponse.json({
      configured: true,
      contentDataSourceId,
      dataSources,
      seasonId,
      list,
      ...lookups,
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

// POST: create a fixture.
export async function POST(req: Request) {
  const { res } = await requireUser();
  if (res) return res;

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
    const id = await insertFixture(conn.pool, fixture);
    await writeUpdateLog(conn.pool, updateLogPages(fixture, false));
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: `Save failed: ${e instanceof Error ? e.message : "insert failed"}` },
      { status: 502 },
    );
  }
}
