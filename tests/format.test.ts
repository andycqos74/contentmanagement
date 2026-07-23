import { describe, expect, it } from "vitest";
import { formatDate, truncate } from "@/lib/widgets/format";

describe("truncate", () => {
  it("returns text unchanged when within the limit", () => {
    expect(truncate("hello world", 20)).toBe("hello world");
  });

  it("truncates at a word boundary and adds an ellipsis", () => {
    const r = truncate("the quick brown fox jumps over", 12);
    expect(r.endsWith("…")).toBe(true);
    expect(r.length).toBeLessThanOrEqual(13);
  });

  it("handles empty text and non-positive limits", () => {
    expect(truncate("", 10)).toBe("");
    expect(truncate("abc", 0)).toBe("abc");
  });
});

describe("formatDate", () => {
  it("formats DD/MM/YYYY", () => {
    expect(formatDate(new Date(2026, 6, 20), "DD/MM/YYYY")).toBe("20/07/2026");
  });

  it("formats MMM D, YYYY", () => {
    expect(formatDate(new Date(2026, 6, 20), "MMM D, YYYY")).toBe("Jul 20, 2026");
  });

  it("returns empty string for falsy input", () => {
    expect(formatDate("", "DD/MM/YYYY")).toBe("");
    expect(formatDate(null, "DD/MM/YYYY")).toBe("");
  });

  it("passes through an unparseable value", () => {
    expect(formatDate("not a date", "DD/MM/YYYY")).toBe("not a date");
  });
});
