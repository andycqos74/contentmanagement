import { NextResponse } from "next/server";
import { fetchStorageFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public proxy: streams an image from storage (fetched with the CMS's credentials)
// so widget images load with no CDN login. Restricted to images so it can't be
// used to read arbitrary files.
const IMG_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const rel = (path ?? []).join("/");
  if (!rel) return new NextResponse("Not found", { status: 404 });

  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  const byExt = IMG_TYPES[ext];
  const upstream = await fetchStorageFile(rel);
  if (!upstream || !upstream.ok || !upstream.body) {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstreamType = upstream.headers.get("content-type") ?? "";
  const type = byExt ?? (/^image\//i.test(upstreamType) ? upstreamType : null);
  if (!type) {
    // Not a recognised image — don't proxy arbitrary files.
    return new NextResponse("Not found", { status: 404 });
  }

  const headers = new Headers({ "Content-Type": type });
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  return new Response(upstream.body, { status: 200, headers });
}
