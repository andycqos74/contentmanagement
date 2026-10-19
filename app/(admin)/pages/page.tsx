import { prisma } from "@/lib/db";
import { PagesAdmin } from "./PagesAdmin";

export const dynamic = "force-dynamic";

export default async function PagesPage() {
  const pages = await prisma.page.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, slug: true, status: true, updatedAt: true },
  });
  return (
    <PagesAdmin
      pages={pages.map((p) => ({
        ...p,
        status: p.status as "DRAFT" | "PUBLISHED",
        updatedAt: p.updatedAt.toISOString(),
      }))}
    />
  );
}
