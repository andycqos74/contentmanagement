import { describe, expect, it } from "vitest";
import {
  applyBannerRow,
  bannerBoundColumns,
  bannerQueryBinding,
  isBannerBindingComplete,
} from "@/lib/widgets/banner-data";
import { buildSelect } from "@/lib/datasource/query-builder";
import { bannerElementSchema, dataBindingSchema, type BannerElement } from "@/lib/widgets/registry";

const el = (o: Record<string, unknown>) => bannerElementSchema.parse({ id: "e", ...o }) as BannerElement;

describe("banner data link", () => {
  it("requires a table and a sort column", () => {
    expect(isBannerBindingComplete(dataBindingSchema.parse({}))).toBe(false);
    expect(isBannerBindingComplete(dataBindingSchema.parse({ table: "promo" }))).toBe(false);
    expect(
      isBannerBindingComplete(
        dataBindingSchema.parse({ table: "promo", orderBy: { column: "id", dir: "DESC" } }),
      ),
    ).toBe(true);
  });

  it("always queries a single row in the chosen order", () => {
    const b = dataBindingSchema.parse({
      table: "promo",
      limit: 12,
      orderBy: { column: "updated_at", dir: "DESC" },
    });
    expect(buildSelect(bannerQueryBinding(b), ["headline"]).sql).toBe(
      "SELECT `headline` FROM `promo` ORDER BY `updated_at` DESC LIMIT 1",
    );
  });

  it("collects the distinct bound columns", () => {
    const items = [
      el({ type: "text", dataField: "headline" }),
      el({ type: "image", dataField: "image" }),
      el({ type: "button", dataField: "headline", urlField: "link" }),
      el({ type: "shape" }),
    ];
    expect(bannerBoundColumns(items)).toEqual(["headline", "image", "link"]);
  });

  it("substitutes bound content and falls back to static values", () => {
    const row = { headline: "Sale now on", image: "https://cdn/x.jpg", link: "https://shop" };
    expect(applyBannerRow(el({ type: "text", text: "Static", dataField: "headline" }), row)).toMatchObject({
      text: "Sale now on",
    });
    expect(applyBannerRow(el({ type: "image", dataField: "image" }), row)).toMatchObject({
      imageUrl: "https://cdn/x.jpg",
    });
    expect(
      applyBannerRow(el({ type: "button", text: "Go", url: "/", urlField: "link" }), row),
    ).toMatchObject({ text: "Go", url: "https://shop" });
    // Missing column / no row keep the static content.
    expect(applyBannerRow(el({ type: "text", text: "Static", dataField: "nope" }), row)).toMatchObject({
      text: "Static",
    });
    expect(applyBannerRow(el({ type: "text", text: "Static", dataField: "headline" }), null)).toMatchObject({
      text: "Static",
    });
  });
});
