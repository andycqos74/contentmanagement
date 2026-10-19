import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageEditor } from "./PageEditor";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const page = await prisma.page.findUnique({ where: { id: (await params).id } });
  if (!page) notFound();
  return (
    <PageEditor
      appUrl={(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "")}
      initial={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content,
        status: page.status as "DRAFT" | "PUBLISHED",
        dirtySincePublish:
          page.status === "PUBLISHED" && (!page.publishedAt || page.updatedAt > page.publishedAt),
      }}
    />
  );
}
