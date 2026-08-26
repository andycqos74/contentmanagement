import { describe, expect, it } from "vitest";
import { htmlToPlainText, toMysqlDateTime } from "@/lib/news/repository";

describe("htmlToPlainText", () => {
  it("strips tags", () => {
    expect(htmlToPlainText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });
  it("decodes entities", () => {
    expect(htmlToPlainText("A &amp; B &lt;3 &#39;q&#39; &nbsp;x")).toBe("A & B <3 'q'  x".trim());
  });
  it("handles empty / plain input", () => {
    expect(htmlToPlainText("")).toBe("");
    expect(htmlToPlainText("just text")).toBe("just text");
  });
});

describe("toMysqlDateTime", () => {
  it("normalises a datetime-local value", () => {
    expect(toMysqlDateTime("2026-08-26T14:30")).toBe("2026-08-26 14:30:00");
  });
  it("keeps an existing MySQL datetime (with seconds)", () => {
    expect(toMysqlDateTime("2026-08-26 14:30:45")).toBe("2026-08-26 14:30:45");
  });
  it("expands a date-only value to midnight", () => {
    expect(toMysqlDateTime("2026-08-26")).toBe("2026-08-26 00:00:00");
  });
  it("throws on an unparseable value", () => {
    expect(() => toMysqlDateTime("not-a-date")).toThrow();
  });
});
