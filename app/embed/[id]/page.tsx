import { notFound } from "next/navigation";
import { WidgetRenderer } from "@/components/widgets/WidgetRenderer";
import { getPublishedWidget } from "@/lib/widgets/serve";
import { googleFontHref } from "@/lib/widgets/fonts";
import { AutoResize } from "./AutoResize";

export const dynamic = "force-dynamic";

// Standalone, full-bleed render of a published widget. Loaded inside the
// iframe injected by /embed.js on the host page.
export default async function EmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const widget = await getPublishedWidget(id);
  if (!widget) notFound();

  const fontHref = googleFontHref(
    (widget.settings as { fontFamily?: string } | null)?.fontFamily,
  );

  return (
    <>
      {/* Reset the shared root layout so the iframe measures true content height. */}
      <style>{`html,body{height:auto!important;min-height:0!important;margin:0!important;background:transparent!important;display:block!important}`}</style>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <WidgetRenderer type={widget.type} settings={widget.settings} items={widget.items} />
      <AutoResize id={widget.id} />
    </>
  );
}
