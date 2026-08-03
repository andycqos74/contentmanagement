import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rewritePublicUrls, toPublicUrl } from "@/lib/storage";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.STORAGE_USERNAME = "u";
  process.env.STORAGE_PASSWORD = "p";
  delete process.env.STORAGE_TYPE;
  delete process.env.STORAGE_PUBLIC_URL;
});
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("public URL rewriting — WebDAV (/dav) mode", () => {
  beforeEach(() => {
    process.env.STORAGE_BASE_URL = "https://cdn.qosfc.com/dav";
  });

  it("rewrites a /dav link to the friendly (non-/dav) URL by default", () => {
    expect(toPublicUrl("https://cdn.qosfc.com/dav/photos/a.jpg")).toBe(
      "https://cdn.qosfc.com/photos/a.jpg",
    );
  });

  it("leaves URLs that aren't under the storage base untouched", () => {
    expect(toPublicUrl("https://example.com/x.png")).toBe("https://example.com/x.png");
  });

  it("deep-rewrites every storage URL inside nested widget JSON", () => {
    const input = {
      bgImage: "https://cdn.qosfc.com/dav/bg.png",
      elements: [
        { type: "image", imageUrl: "https://cdn.qosfc.com/dav/1.png" },
        { type: "text", text: "no url here" },
      ],
    };
    expect(rewritePublicUrls(input)).toEqual({
      bgImage: "https://cdn.qosfc.com/bg.png",
      elements: [
        { type: "image", imageUrl: "https://cdn.qosfc.com/1.png" },
        { type: "text", text: "no url here" },
      ],
    });
  });

  it("honours an explicit STORAGE_PUBLIC_URL override", () => {
    process.env.STORAGE_PUBLIC_URL = "https://files.qosfc.com";
    expect(toPublicUrl("https://cdn.qosfc.com/dav/x.jpg")).toBe("https://files.qosfc.com/x.jpg");
  });
});

describe("public URL rewriting — Combined Storage (no /dav) mode", () => {
  it("is a no-op when the base has no /dav and no override is set", () => {
    process.env.STORAGE_BASE_URL = "http://localhost:4000";
    expect(toPublicUrl("http://localhost:4000/f/tok")).toBe("http://localhost:4000/f/tok");
    expect(rewritePublicUrls({ u: "http://localhost:4000/f/tok" })).toEqual({
      u: "http://localhost:4000/f/tok",
    });
  });
});
