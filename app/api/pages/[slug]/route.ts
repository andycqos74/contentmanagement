import { NextResponse } from "next/server";
import { getPublicPage } from "@/lib/pages/serve";
import { PAGE_CONTENT_CSS } from "@/lib/pages/content-css";

export const dynamic = "force-dynamic";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Public, CORS-enabled page payload: { id, title, slug, html, css, updatedAt }.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const page = await getPublicPage((await params).slug);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });
  return NextResponse.json({ ...page, css: PAGE_CONTENT_CSS }, {
    headers: { ...CORS, "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" },
  });
}
