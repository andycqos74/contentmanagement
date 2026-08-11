"use client";

import {
  bannerElementSchema,
  bannerSettingsSchema,
  cookieConsentSettingsSchema,
  galleryAlbumSchema,
  galleryBrowserSettingsSchema,
  gallerySettingsSchema,
  galleryItemSchema,
  heroSettingsSchema,
  heroSlideSchema,
  newsItemSchema,
  newsSettingsSchema,
  sliderSettingsSchema,
  sliderSlideSchema,
  type BannerElement,
  type SliderSlide,
  type WidgetTypeKey,
} from "@/lib/widgets/registry";
import { Banner } from "./Banner";
import { CookieConsent } from "./CookieConsent";
import { Gallery } from "./Gallery";
import { GalleryBrowser } from "./GalleryBrowser";
import { HeroSlider } from "./HeroSlider";
import { LatestNews } from "./LatestNews";
import { Slider } from "./Slider";

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

  if (type === "COOKIE_CONSENT") {
    return <CookieConsent settings={cookieConsentSettingsSchema.parse(settings ?? {})} />;
  }

  if (type === "SLIDER") {
    const slides = (items ?? [])
      .map((x) => sliderSlideSchema.safeParse(x))
      .flatMap((r) => (r.success ? [r.data as SliderSlide] : []));
    return <Slider settings={sliderSettingsSchema.parse(settings ?? {})} items={slides} />;
  }

  if (type === "GALLERY") {
    return (
      <Gallery
        settings={gallerySettingsSchema.parse(settings ?? {})}
        items={(items ?? []).map((x) => galleryItemSchema.parse(x ?? {}))}
      />
    );
  }

  if (type === "GALLERY_BROWSER") {
    return (
      <GalleryBrowser
        settings={galleryBrowserSettingsSchema.parse(settings ?? {})}
        items={(items ?? []).map((x) => galleryAlbumSchema.parse(x ?? {}))}
      />
    );
  }

  return (
    <LatestNews
      settings={newsSettingsSchema.parse(settings ?? {})}
      items={(items ?? []).map((x) => newsItemSchema.parse(x ?? {}))}
    />
  );
}
