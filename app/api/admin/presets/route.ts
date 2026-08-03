import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { PRESET_STYLE_KEYS, type BannerElementType } from "@/lib/widgets/registry";

const TYPES: BannerElementType[] = ["text", "image", "shape", "button"];

// Shared element style presets (used by the banner/slider element editor).
export async function GET() {
  const { res } = await requireUser();
  if (res) return res;
  const presets = await prisma.elementPreset.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, data: true },
  });
  return NextResponse.json({ presets });
}

export async function POST(req: Request) {
  const { res } = await requireUser();
  if (res) return res;

  const body = await req.json().catch(() => ({}));
  const type = body.type as BannerElementType;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid element type" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "A preset name is required" }, { status: 400 });
  }

  // Keep only the whitelisted style fields for this element type.
  const raw = (body.data ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const k of PRESET_STYLE_KEYS[type]) if (raw[k] !== undefined) data[k] = raw[k];

  const preset = await prisma.elementPreset.create({
    data: { name, type, data: data as Prisma.InputJsonValue },
    select: { id: true, name: true, type: true, data: true },
  });
  return NextResponse.json({ preset }, { status: 201 });
}
