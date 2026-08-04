import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { isStorageConfigured, listFolderImages, type GallerySort } from "@/lib/storage";

export const runtime = "nodejs";

// Live image listing for a storage folder — used by the gallery editor preview.
// The public embed resolves the same folder server-side in lib/widgets/serve.
export async function GET(req: Request) {
  const { res } = await requireUser();
  if (res) return res;
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Image storage is not configured." }, { status: 503 });
  }
  const sp = new URL(req.url).searchParams;
  const path = sp.get("path") ?? "";
  const sort = (sp.get("sort") ?? "name-asc") as GallerySort;
  const limit = Number(sp.get("limit") ?? "0") || 0;
  try {
    return NextResponse.json({ items: await listFolderImages(path, sort, limit) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list folder" },
      { status: 502 },
    );
  }
}
