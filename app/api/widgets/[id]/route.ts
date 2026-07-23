import { NextResponse } from "next/server";
import { getPublishedWidget } from "@/lib/widgets/serve";

export const dynamic = "force-dynamic";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const widget = await getPublishedWidget(id);
  if (!widget) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });
  }
  return NextResponse.json(widget, {
    headers: {
      ...CORS,
      "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
