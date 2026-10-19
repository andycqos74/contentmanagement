import { prisma } from "@/lib/db";

export type PublishedPage = {
  id: string;
  title: string;
  slug: string;
  html: string;
  publishedAt: string | null;
};

// The published snapshot of a page by slug, or null when missing/unpublished.
export async function getPublishedPage(slug: string): Promise<PublishedPage | null> {
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page || page.status !== "PUBLISHED" || page.publishedContent === null) return null;
  return {
    id: page.id,
    title: page.publishedTitle ?? page.title,
    slug: page.slug,
    html: page.publishedContent,
    publishedAt: page.publishedAt?.toISOString() ?? null,
  };
}
