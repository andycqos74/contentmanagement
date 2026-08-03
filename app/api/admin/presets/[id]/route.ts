import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { res } = await requireUser();
  if (res) return res;
  const { id } = await params;
  await prisma.elementPreset.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
