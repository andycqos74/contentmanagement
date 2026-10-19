import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { sanitizePageHtml } from "@/lib/pages/sanitize";

export const runtime = "nodejs";

// Snapshot the draft into the published fields (re-sanitised defensively).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { res } = await requireUser();
  if (res) return res;
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.page.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedTitle: page.title,
      publishedContent: sanitizePageHtml(page.content),
      publishedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
