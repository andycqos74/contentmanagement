import { describe, expect, it } from "vitest";
import { sanitizePageHtml, slugify } from "@/lib/pages/sanitize";

describe("sanitizePageHtml", () => {
  it("strips scripts, handlers and javascript: links", () => {
    const out = sanitizePageHtml(
      '<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">a</a>',
    );
    expect(out).not.toMatch(/script|onclick|javascript:/i);
    expect(out).toContain("<p>Hi</p>");
  });

  it("keeps formatting, images and allowed video iframes only", () => {
    const out = sanitizePageHtml(
      '<h2 style="text-align:center">T</h2><img src="https://cdn/a.jpg" alt="a">' +
        '<iframe src="https://www.youtube.com/embed/x"></iframe><iframe src="https://evil.example/"></iframe>',
    );
    expect(out).toContain('style="text-align:center"');
    expect(out).toContain('<img src="https://cdn/a.jpg"');
    expect(out).toContain("youtube.com/embed/x");
    expect(out).not.toContain("evil.example");
  });
});

describe("slugify", () => {
  it("makes url-safe slugs", () => {
    expect(slugify("  Café & Club — News! ")).toBe("cafe-club-news");
    expect(slugify("***")).toBe("");
  });
});
