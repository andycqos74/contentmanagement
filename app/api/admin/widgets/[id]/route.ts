import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import {
  dataBindingSchema,
  getWidgetDef,
  type WidgetTypeKey,
} from "@/lib/widgets/registry";

export async function GET(
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
  return NextResponse.json({ widget });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { res } = await requireUser();
  if (res) return res;
  const { id } = await params;

  const existing = await prisma.widget.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const def = getWidgetDef(existing.type as WidgetTypeKey);

  const body = await req.json().catch(() => ({}));
  const data: Prisma.WidgetUpdateInput = {};

  if (typeof body.name === "string") data.name = body.name.trim() || "Untitled widget";
  if (body.settings !== undefined) {
    data.settings = def.settingsSchema.parse(body.settings) as Prisma.InputJsonValue;
  }
  if (body.contentSource === "MANUAL" || body.contentSource === "DATA") {
    data.contentSource = body.contentSource;
  }
  if (body.dataSourceId !== undefined) {
    data.dataSource = body.dataSourceId
      ? { connect: { id: String(body.dataSourceId) } }
      : { disconnect: true };
  }
  if (body.dataBinding !== undefined) {
    data.dataBinding = body.dataBinding
      ? (dataBindingSchema.parse(body.dataBinding) as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  }

  const replaceItems = Array.isArray(body.items);

  const widget = await prisma.$transaction(async (tx) => {
    if (replaceItems) {
      await tx.widgetItem.deleteMany({ where: { widgetId: id } });
      if (body.items.length > 0) {
        await tx.widgetItem.createMany({
          data: body.items.map((it: unknown, i: number) => ({
            widgetId: id,
            sortOrder: i,
            data: def.itemSchema.parse(it ?? {}) as Prisma.InputJsonValue,
          })),
        });
      }
    }
    return tx.widget.update({
      where: { id },
      data,
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
  });

  return NextResponse.json({ widget });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { res } = await requireUser();
  if (res) return res;
  const { id } = await params;
  await prisma.widget.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
