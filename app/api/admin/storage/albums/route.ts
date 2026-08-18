import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { isStorageConfigured, listFolderImages, listSubfolders } from "@/lib/storage";

export const runtime = "nodejs";

// Lists the sub-folders of a parent folder as candidate albums (with a cover
// thumbnail and image count) so the gallery-browser editor can offer a per-folder
// display toggle and title. The public embed resolves the same folders in
// lib/widgets/serve.
export async function GET(req: Request) {
  const { res } = await requireUser();
  if (res) return res;
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Image storage is not configured." }, { status: 503 });
  }
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!path) return NextResponse.json({ albums: [] });

  try {
    const dirs = await listSubfolders(path);
    const albums = await Promise.all(
      dirs.map(async (d) => {
        const images = await listFolderImages(d.path, "name-asc", 0);
        return {
          path: d.path,
          name: d.name,
          count: images.length,
          cover: images[0]?.imageUrl ?? "",
          modified: d.modified ?? null,
        };
      }),
    );
    return NextResponse.json({ albums });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list folders" },
      { status: 502 },
    );
  }
}
