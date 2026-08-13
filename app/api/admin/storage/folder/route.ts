import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { createFolder, isStorageConfigured } from "@/lib/storage";

export const runtime = "nodejs";

// Creates a sub-folder under `parent` (or at the storage root when parent is
// empty). The name is sanitised to a single path segment so it can only ever
// create one folder in the intended place.
export async function POST(req: Request) {
  const { res } = await requireUser();
  if (res) return res;
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Image storage is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { parent?: unknown; name?: unknown };
  const parent = typeof body.parent === "string" ? body.parent.replace(/^\/+|\/+$/g, "") : "";
  const name = typeof body.name === "string" ? body.name.replace(/[^\w\- ]+/g, "").trim() : "";
  if (!name) {
    return NextResponse.json({ error: "A folder name is required" }, { status: 400 });
  }
  if (parent.split("/").some((s) => s === "..")) {
    return NextResponse.json({ error: "Invalid parent folder" }, { status: 400 });
  }

  const path = parent ? `${parent}/${name}` : name;
  try {
    await createFolder(path);
    return NextResponse.json({ ok: true, path });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create folder" },
      { status: 502 },
    );
  }
}
