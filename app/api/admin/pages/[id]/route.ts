import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { pageInputSchema } from "@/lib/pages/input";
import { sanitizePageHtml, slugify } from "@/lib/pages/sanitize";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { res } = await requireUser();
  if (res) return res;
  const page = await prisma.page.findUnique({ where: { id: (await params).id } });
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page });
}

// Save the draft. The public site keeps serving the published snapshot.
export async function PUT(req: Request, { params }: Ctx) {
  const { res } = await requireUser();
  if (res) return res;
  const { id } = await params;

  const parsed = pageInputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slug = slugify(parsed.data.slug || parsed.data.title);
  if (!slug) return NextResponse.json({ error: "Could not derive a URL slug" }, { status: 400 });
  const clash = await prisma.page.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) {
    return NextResponse.json({ error: `The slug "${slug}" is already in use` }, { status: 409 });
  }

  const page = await prisma.page.update({
    where: { id },
    data: { title: parsed.data.title, slug, content: sanitizePageHtml(parsed.data.content) },
  });
  return NextResponse.json({ page });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { res } = await requireUser();
  if (res) return res;
  await prisma.page.deleteMany({ where: { id: (await params).id } });
  return NextResponse.json({ ok: true });
}
