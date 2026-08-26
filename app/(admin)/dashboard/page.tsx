import { prisma } from "@/lib/db";
import { WIDGETS, WIDGET_LIST, type WidgetTypeKey } from "@/lib/widgets/registry";
import { WidgetsDashboard } from "./WidgetsDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const widgets = await prisma.widget.findMany({ orderBy: { updatedAt: "desc" } });

  const widgetData = widgets.map((w) => ({
    id: w.id,
    name: w.name,
    type: w.type as WidgetTypeKey,
    typeLabel: WIDGETS[w.type as WidgetTypeKey]?.label ?? w.type,
    status: w.status as "PUBLISHED" | "DRAFT",
    contentSource: w.contentSource as "MANUAL" | "DATA",
    updatedAt: w.updatedAt.toISOString(),
  }));

  const widgetTypes = WIDGET_LIST.map((w) => ({
    key: w.key,
    label: w.label,
    description: w.description,
  }));

  return <WidgetsDashboard widgets={widgetData} widgetTypes={widgetTypes} />;
}
