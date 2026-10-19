import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentPool } from "@/lib/news/service";
import { getById } from "@/lib/pages/repository";
import { PageEditor } from "./PageEditor";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const conn = await getContentPool();
  if ("error" in conn) {
    return (
      <p style={{ fontSize: 14, color: "#475467" }}>
        {conn.error} <Link href="/news" style={{ color: "#0A4B93" }}>Open News to choose it.</Link>
      </p>
    );
  }
  const page = await getById(conn.pool, id);
  if (!page) notFound();
  return (
    <PageEditor
      appUrl={(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "")}
      initial={{
        id: page.CMSPageID,
        shortName: page.CMSPageShortName,
        title: page.CMSPageLongName,
        content: page.Content,
      }}
    />
  );
}
