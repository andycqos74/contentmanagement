import { describe, expect, it } from "vitest";
import { galleryImagesFromEntries, type StorageEntry } from "@/lib/storage";

function f(name: string, over: Partial<StorageEntry> = {}): StorageEntry {
  return { name, isDir: false, path: name, url: `https://cdn/${name}`, ...over };
}
const urls = (items: { imageUrl: string }[]) => items.map((i) => i.imageUrl);

describe("galleryImagesFromEntries", () => {
  it("keeps only image files (drops folders and non-images)", () => {
    const out = galleryImagesFromEntries(
      [f("a.jpg"), f("photos", { isDir: true, url: null }), f("notes.txt"), f("b.png")],
      "name-asc",
      0,
    );
    expect(urls(out)).toEqual(["https://cdn/a.jpg", "https://cdn/b.png"]);
  });

  it("sorts by name ascending/descending (numeric-aware)", () => {
    const entries = [f("img10.jpg"), f("img2.jpg"), f("img1.jpg")];
    expect(urls(galleryImagesFromEntries(entries, "name-asc", 0))).toEqual([
      "https://cdn/img1.jpg",
      "https://cdn/img2.jpg",
      "https://cdn/img10.jpg",
    ]);
    expect(urls(galleryImagesFromEntries(entries, "name-desc", 0))).toEqual([
      "https://cdn/img10.jpg",
      "https://cdn/img2.jpg",
      "https://cdn/img1.jpg",
    ]);
  });

  it("sorts by modified date for newest/oldest", () => {
    const entries = [
      f("old.jpg", { modified: 1000 }),
      f("new.jpg", { modified: 3000 }),
      f("mid.jpg", { modified: 2000 }),
    ];
    expect(urls(galleryImagesFromEntries(entries, "newest", 0))).toEqual([
      "https://cdn/new.jpg",
      "https://cdn/mid.jpg",
      "https://cdn/old.jpg",
    ]);
    expect(urls(galleryImagesFromEntries(entries, "oldest", 0))).toEqual([
      "https://cdn/old.jpg",
      "https://cdn/mid.jpg",
      "https://cdn/new.jpg",
    ]);
  });

  it("derives a tidy caption from the filename", () => {
    const [img] = galleryImagesFromEntries([f("summer_party-2024.jpg")], "name-asc", 0);
    expect(img.caption).toBe("summer party 2024");
  });

  it("applies the limit", () => {
    const entries = [f("a.jpg"), f("b.jpg"), f("c.jpg")];
    expect(urls(galleryImagesFromEntries(entries, "name-asc", 2))).toEqual([
      "https://cdn/a.jpg",
      "https://cdn/b.jpg",
    ]);
  });

  it("detects images by mime type when the extension is missing", () => {
    expect(galleryImagesFromEntries([f("weird", { mime: "image/webp" })], "name-asc", 0)).toHaveLength(1);
  });
});
