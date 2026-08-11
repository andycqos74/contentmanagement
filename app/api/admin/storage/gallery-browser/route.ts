import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { isStorageConfigured, rewritePublicUrls } from "@/lib/storage";
import { galleryBrowserAlbums } from "@/lib/widgets/serve";

export const runtime = "nodejs";

// Resolves the albums (folders + inline images) for a gallery-browser widget so
// the editor preview matches exactly what the published embed will render. Takes
// the working settings so unsaved display/title/sort changes preview live.
export async function POST(req: Request) {
  const { res } = await requireUser();
  if (res) return res;
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Image storage is not configured." }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const settings = (body?.settings ?? {}) as Record<string, unknown>;
  try {
    const albums = await galleryBrowserAlbums(settings);
    return NextResponse.json({ albums: rewritePublicUrls(albums) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to resolve albums" },
      { status: 502 },
    );
  }
}
