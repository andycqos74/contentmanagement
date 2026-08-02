"use client";

import {
  bannerElementSchema,
  bannerSettingsSchema,
  heroSettingsSchema,
  heroSlideSchema,
  newsItemSchema,
  newsSettingsSchema,
  type BannerElement,
  type WidgetTypeKey,
} from "@/lib/widgets/registry";
import { Banner } from "./Banner";
import { HeroSlider } from "./HeroSlider";
import { LatestNews } from "./LatestNews";

// Renders any widget from loosely-typed settings/items, coercing both through
// the registry schemas so partial/in-progress editor state renders safely.
export function WidgetRenderer({
  type,
  settings,
  items,
}: {
  type: WidgetTypeKey;
  settings: unknown;
  items: unknown[];
}) {
  if (type === "HERO_SLIDER") {
    return (
      <HeroSlider
        settings={heroSettingsSchema.parse(settings ?? {})}
        items={(items ?? []).map((x) => heroSlideSchema.parse(x ?? {}))}
      />
    );
  }

  if (type === "BANNER") {
    const elements = (items ?? [])
      .map((x) => bannerElementSchema.safeParse(x))
      .flatMap((r) => (r.success ? [r.data as BannerElement] : []));
    return <Banner settings={bannerSettingsSchema.parse(settings ?? {})} items={elements} />;
  }

  return (
    <LatestNews
      settings={newsSettingsSchema.parse(settings ?? {})}
      items={(items ?? []).map((x) => newsItemSchema.parse(x ?? {}))}
    />
  );
}
