import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { isStorageConfigured, uploadImage } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

// Accepts a multipart form with a `file` field, forwards the bytes to Combined
// Storage, and returns the public CDN URL to store on the widget.
export async function POST(req: Request) {
  const { res } = await requireUser();
  if (res) return res;

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Image storage is not configured. Set STORAGE_BASE_URL, STORAGE_USERNAME and STORAGE_PASSWORD.",
      },
      { status: 503 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 15 MB)" }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { url } = await uploadImage(
      bytes,
      file.name || "upload",
      file.type || "application/octet-stream",
    );
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 502 },
    );
  }
}
