import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { isStorageConfigured, listStorage } from "@/lib/storage";

export const runtime = "nodejs";

// Lists a folder in the configured storage backend so the editor can pick an
// existing file. Auth-gated; storage credentials stay server-side.
export async function GET(req: Request) {
  const { res } = await requireUser();
  if (res) return res;

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Image storage is not configured." }, { status: 503 });
  }

  const path = new URL(req.url).searchParams.get("path") ?? "";
  try {
    return NextResponse.json(await listStorage(path));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Browse failed" },
      { status: 502 },
    );
  }
}
