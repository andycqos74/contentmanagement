import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { listColumns, listTables } from "@/lib/datasource/introspect";

// GET            -> { tables: string[] }
// GET ?table=X   -> { columns: { name, type }[] }
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { res } = await requireUser();
  if (res) return res;
  const { id } = await params;

  const ds = await prisma.dataSource.findUnique({ where: { id } });
  if (!ds) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const table = new URL(req.url).searchParams.get("table");
  try {
    if (table) return NextResponse.json({ columns: await listColumns(ds, table) });
    return NextResponse.json({ tables: await listTables(ds) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Introspection failed" },
      { status: 400 },
    );
  }
}
