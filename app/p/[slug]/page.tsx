import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPage } from "@/lib/pages/serve";
import { PAGE_CONTENT_CSS } from "@/lib/pages/content-css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPublicPage((await params).slug);
  return { title: page?.title ?? "Page not found" };
}

// Server-rendered public page (no iframe, no client JS).
export default async function PublicPage({ params }: Props) {
  const page = await getPublicPage((await params).slug);
  if (!page) notFound();
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px 64px" }}>
      <style>{PAGE_CONTENT_CSS}</style>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>{page.title}</h1>
      {/* HTML is whitelisted by sanitizePageHtml on save and publish. */}
      <div className="cms-page" dangerouslySetInnerHTML={{ __html: page.html }} />
    </main>
  );
}
