// Shared helpers for the News admin API routes: resolve a pooled connection to
// the configured content DB, and validate/normalise the editable news payload.
import { z } from "zod";
import type { Pool } from "mysql2/promise";
import { getPool } from "@/lib/datasource/pool";
import { getContentDataSource } from "@/lib/settings";
import type { NewsItem } from "./repository";

// Resolve the mysql2 pool for the configured content DataSource, or an error to
// return to the client when News hasn't been pointed at a database yet. Callers
// discriminate with `"error" in result`.
export async function getContentPool(): Promise<{ pool: Pool } | { error: string }> {
  const ds = await getContentDataSource();
  if (!ds) {
    return {
      error:
        "No content database selected. Choose which data source holds the news tables on the News page.",
    };
  }
  return { pool: getPool(ds) };
}

// Input accepted from the editor form (subset of NewsItem the user controls).
export const newsInputSchema = z.object({
  CategoryID: z.coerce.number().int().positive(),
  SubjectID: z.coerce.number().int().nullable().optional(),
  FixtureID: z.coerce.number().int().nullable().optional(),
  Headline: z.string().trim().min(1, "Headline is required"),
  ItemText: z.string().default(""),
  PublishDate: z.string().trim().min(1, "Publish date is required"),
  UserID: z.string().nullable().optional(),
  NewCustomImage: z.string().nullable().optional(),
  TWPostText: z.string().nullable().optional(),
  FBPostText: z.string().nullable().optional(),
  Sticky: z.coerce.boolean().optional(),
});

export type NewsInput = z.infer<typeof newsInputSchema>;

// Map validated input to the repository's NewsItem shape.
export function toNewsItem(input: NewsInput, newsId = 0): NewsItem {
  return {
    NewsID: newsId,
    CategoryID: input.CategoryID,
    SubjectID: input.SubjectID ?? null,
    FixtureID: input.FixtureID ?? null,
    Headline: input.Headline,
    ItemText: input.ItemText ?? "",
    PublishDate: input.PublishDate,
    UserID: input.UserID ?? null,
    NewCustomImage: input.NewCustomImage ?? null,
    TWPostText: input.TWPostText ?? null,
    FBPostText: input.FBPostText ?? null,
    Sticky: input.Sticky ? 1 : 0,
  };
}
