import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { invalidatePool } from "@/lib/datasource/pool";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { res } = await requireUser();
  if (res) return res;
  const { id } = await params;
  invalidatePool(id);
  await prisma.dataSource.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
