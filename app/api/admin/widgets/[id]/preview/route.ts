import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { resolveContent } from "@/lib/widgets/resolve-content";
import { dataBindingSchema, type WidgetTypeKey } from "@/lib/widgets/registry";

// Resolves data-driven items for the current (possibly unsaved) binding so the
// editor can live-preview DATA mode. Auth-gated.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { res } = await requireUser();
  if (res) return res;
  const { id } = await params;

  const widget = await prisma.widget.findUnique({ where: { id } });
  if (!widget) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const dataSourceId = body.dataSourceId ?? widget.dataSourceId;
  if (!dataSourceId) {
    return NextResponse.json({ error: "No data source selected" }, { status: 400 });
  }

  try {
    const binding = dataBindingSchema.parse(body.dataBinding ?? widget.dataBinding ?? {});
    const items = await resolveContent({
      type: widget.type as WidgetTypeKey,
      contentSource: "DATA",
      dataSourceId,
      dataBinding: binding,
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Query failed" },
      { status: 400 },
    );
  }
}
