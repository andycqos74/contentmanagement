import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

// Snapshot the current draft into `published` and mark the widget PUBLISHED.
// Live embeds always serve the snapshot, so edits are invisible until re-published.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { res } = await requireUser();
  if (res) return res;
  const { id } = await params;

  const widget = await prisma.widget.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!widget) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const snapshot = {
    settings: widget.settings,
    contentSource: widget.contentSource,
    dataSourceId: widget.dataSourceId,
    dataBinding: widget.dataBinding ?? null,
    items: widget.contentSource === "MANUAL" ? widget.items.map((i) => i.data) : null,
  };

  await prisma.widget.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      published: snapshot as Prisma.InputJsonValue,
      publishedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
