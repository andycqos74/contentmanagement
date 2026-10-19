import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { pageInputSchema } from "@/lib/pages/input";
import { sanitizePageHtml, slugify } from "@/lib/pages/sanitize";

export const runtime = "nodejs";

export async function GET() {
  const { res } = await requireUser();
  if (res) return res;
  const pages = await prisma.page.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, slug: true, status: true, updatedAt: true, publishedAt: true },
  });
  return NextResponse.json({ pages });
}

export async function POST(req: Request) {
  const { user, res } = await requireUser();
  if (res) return res;

  const parsed = pageInputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const slug = slugify(parsed.data.slug || parsed.data.title);
  if (!slug) return NextResponse.json({ error: "Could not derive a URL slug" }, { status: 400 });
  if (await prisma.page.findUnique({ where: { slug }, select: { id: true } })) {
    return NextResponse.json({ error: `The slug "${slug}" is already in use` }, { status: 409 });
  }

  const page = await prisma.page.create({
    data: {
      id: nanoid(12),
      title: parsed.data.title,
      slug,
      content: sanitizePageHtml(parsed.data.content),
      createdById: user.id,
    },
    select: { id: true },
  });
  return NextResponse.json({ page }, { status: 201 });
}
