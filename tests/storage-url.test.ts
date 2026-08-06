import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rewritePublicUrls, toPublicUrl } from "@/lib/storage";

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.STORAGE_USERNAME = "u";
  process.env.STORAGE_PASSWORD = "p";
  delete process.env.STORAGE_TYPE;
  delete process.env.STORAGE_PUBLIC_URL;
  delete process.env.STORAGE_PROXY;
  delete process.env.APP_BASE_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
});
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("WebDAV image URLs — proxy mode (default)", () => {
  beforeEach(() => {
    process.env.STORAGE_BASE_URL = "https://cdn.qosfc.com/dav";
  });

  it("rewrites a /dav link to a CMS /api/media URL", () => {
    expect(toPublicUrl("https://cdn.qosfc.com/dav/events/a.jpg")).toBe("/api/media/events/a.jpg");
  });

  it("also rewrites a legacy non-/dav (stripped) link to the proxy", () => {
    expect(toPublicUrl("https://cdn.qosfc.com/events/a.jpg")).toBe("/api/media/events/a.jpg");
  });

  it("uses an absolute URL when APP_BASE_URL is set", () => {
    process.env.APP_BASE_URL = "https://cms.qosfc.com";
    expect(toPublicUrl("https://cdn.qosfc.com/dav/a.jpg")).toBe(
      "https://cms.qosfc.com/api/media/a.jpg",
    );
  });

  it("round-trips encoded spaces/parens in filenames", () => {
    expect(toPublicUrl("https://cdn.qosfc.com/dav/events/photo%20(1).jpg")).toBe(
      "/api/media/events/photo%20(1).jpg",
    );
  });

  it("deep-rewrites storage URLs inside nested JSON", () => {
    const input = {
      bgImage: "https://cdn.qosfc.com/dav/bg.png",
      items: [{ imageUrl: "https://cdn.qosfc.com/dav/1.png" }, { text: "no url" }],
    };
    expect(rewritePublicUrls(input)).toEqual({
      bgImage: "/api/media/bg.png",
      items: [{ imageUrl: "/api/media/1.png" }, { text: "no url" }],
    });
  });

  it("leaves non-storage URLs untouched", () => {
    expect(toPublicUrl("https://example.com/x.png")).toBe("https://example.com/x.png");
  });
});

describe("WebDAV image URLs — proxy disabled (direct friendly URL)", () => {
  beforeEach(() => {
    process.env.STORAGE_BASE_URL = "https://cdn.qosfc.com/dav";
    process.env.STORAGE_PROXY = "false";
  });

  it("rewrites /dav to the stripped public host", () => {
    expect(toPublicUrl("https://cdn.qosfc.com/dav/a.jpg")).toBe("https://cdn.qosfc.com/a.jpg");
  });

  it("honours an explicit STORAGE_PUBLIC_URL", () => {
    process.env.STORAGE_PUBLIC_URL = "https://files.qosfc.com";
    expect(toPublicUrl("https://cdn.qosfc.com/dav/a.jpg")).toBe("https://files.qosfc.com/a.jpg");
  });
});

describe("Combined Storage (no /dav)", () => {
  it("is a no-op — files already have public /f/ URLs", () => {
    process.env.STORAGE_BASE_URL = "http://localhost:4000";
    expect(toPublicUrl("http://localhost:4000/f/tok")).toBe("http://localhost:4000/f/tok");
    expect(rewritePublicUrls({ u: "http://localhost:4000/f/tok" })).toEqual({
      u: "http://localhost:4000/f/tok",
    });
  });
});
