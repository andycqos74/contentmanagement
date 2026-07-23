import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { WIDGETS, getWidgetDef, type WidgetTypeKey } from "@/lib/widgets/registry";

export async function GET() {
  const { res } = await requireUser();
  if (res) return res;
  const widgets = await prisma.widget.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      contentSource: true,
      updatedAt: true,
      publishedAt: true,
    },
  });
  return NextResponse.json({ widgets });
}

export async function POST(req: Request) {
  const { user, res } = await requireUser();
  if (res) return res;

  const body = await req.json().catch(() => ({}));
  const type = body.type as WidgetTypeKey;
  if (!WIDGETS[type]) {
    return NextResponse.json({ error: "Invalid widget type" }, { status: 400 });
  }
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : `New ${WIDGETS[type].label}`;

  const def = getWidgetDef(type);
  const widget = await prisma.widget.create({
    data: {
      id: nanoid(12),
      name,
      type,
      settings: def.defaultSettings as Prisma.InputJsonValue,
      contentSource: "MANUAL",
      createdById: user.id,
      items: { create: [{ sortOrder: 0, data: def.defaultItem as Prisma.InputJsonValue }] },
    },
    select: { id: true },
  });
  return NextResponse.json({ widget }, { status: 201 });
}
