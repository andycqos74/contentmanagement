import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { WidgetTypeKey } from "@/lib/widgets/registry";
import { Editor } from "./Editor";

export const dynamic = "force-dynamic";

export default async function WidgetEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [widget, sources] = await Promise.all([
    prisma.widget.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.dataSource.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, database: true },
    }),
  ]);
  if (!widget) notFound();

  return (
    <Editor
      initial={{
        id: widget.id,
        name: widget.name,
        type: widget.type as WidgetTypeKey,
        status: widget.status,
        contentSource: widget.contentSource,
        settings: widget.settings,
        dataSourceId: widget.dataSourceId,
        dataBinding: widget.dataBinding,
        items: widget.items.map((i) => i.data),
        publishedAt: widget.publishedAt?.toISOString() ?? null,
      }}
      dataSources={sources}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
    />
  );
}
