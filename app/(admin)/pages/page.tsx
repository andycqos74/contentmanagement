import Link from "next/link";
import { getContentPool } from "@/lib/news/service";
import { getList } from "@/lib/pages/repository";
import { PagesAdmin } from "./PagesAdmin";

export const dynamic = "force-dynamic";

export default async function PagesPage() {
  const conn = await getContentPool();
  if ("error" in conn) {
    return (
      <p style={{ fontSize: 14, color: "#475467" }}>
        {conn.error} <Link href="/news" style={{ color: "#0A4B93" }}>Open News to choose it.</Link>
      </p>
    );
  }
  let pages;
  try {
    pages = await getList(conn.pool);
  } catch (e) {
    return (
      <p style={{ fontSize: 14, color: "#B42318" }}>
        Could not read cms_pages: {e instanceof Error ? e.message : "query failed"}
      </p>
    );
  }
  return <PagesAdmin pages={pages} />;
}
