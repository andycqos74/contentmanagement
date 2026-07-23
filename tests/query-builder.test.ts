import { describe, expect, it } from "vitest";
import { buildSelect } from "@/lib/datasource/query-builder";
import type { DataBinding } from "@/lib/widgets/registry";

function binding(over: Partial<DataBinding> = {}): DataBinding {
  return { table: "posts", fieldMap: {}, filters: [], orderBy: null, limit: 10, ...over };
}

describe("buildSelect", () => {
  it("builds a parameterised select with escaped, mapped columns", () => {
    const { sql, params } = buildSelect(binding(), ["title", "published_at"]);
    expect(sql).toBe("SELECT `title`, `published_at` FROM `posts` LIMIT 10");
    expect(params).toEqual([]);
  });

  it("uses * when no columns are provided", () => {
    expect(buildSelect(binding(), []).sql).toBe("SELECT * FROM `posts` LIMIT 10");
  });

  it("binds filter values as parameters", () => {
    const { sql, params } = buildSelect(
      binding({ filters: [{ column: "status", op: "=", value: "published" }] }),
      ["title"],
    );
    expect(sql).toBe("SELECT `title` FROM `posts` WHERE `status` = ? LIMIT 10");
    expect(params).toEqual(["published"]);
  });

  it("combines multiple filters with AND", () => {
    const { sql, params } = buildSelect(
      binding({
        filters: [
          { column: "status", op: "=", value: "published" },
          { column: "category", op: "LIKE", value: "%news%" },
        ],
      }),
      ["title"],
    );
    expect(sql).toContain("WHERE `status` = ? AND `category` LIKE ?");
    expect(params).toEqual(["published", "%news%"]);
  });

  it("adds a whitelisted ORDER BY direction", () => {
    expect(
      buildSelect(binding({ orderBy: { column: "published_at", dir: "DESC" } }), ["title"]).sql,
    ).toContain("ORDER BY `published_at` DESC");
  });

  it("clamps the limit into a safe range", () => {
    expect(buildSelect(binding({ limit: 9999 }), ["title"]).sql).toContain("LIMIT 100");
    expect(buildSelect(binding({ limit: 0 }), ["title"]).sql).toContain("LIMIT 1");
  });

  it("rejects a malicious table identifier", () => {
    expect(() => buildSelect(binding({ table: "posts; DROP TABLE users" }), ["title"])).toThrow(
      /identifier/i,
    );
  });

  it("rejects a malicious column identifier", () => {
    expect(() =>
      buildSelect(binding(), ["title, (SELECT password FROM users)"]),
    ).toThrow(/identifier/i);
  });

  it("rejects a malicious filter column", () => {
    expect(() =>
      buildSelect(binding({ filters: [{ column: "1=1 OR `x", op: "=", value: "y" }] }), ["title"]),
    ).toThrow(/identifier/i);
  });

  it("rejects an operator that is not whitelisted", () => {
    expect(() =>
      buildSelect(
        // @ts-expect-error deliberately passing an invalid operator to test the runtime guard
        binding({ filters: [{ column: "status", op: "; DROP", value: "x" }] }),
        ["title"],
      ),
    ).toThrow(/operator/i);
  });
});
