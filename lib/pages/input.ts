import { z } from "zod";

export const pageInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  content: z.string().default(""),
});

export const newPageSchema = pageInputSchema.extend({
  // CMSPageShortName is varchar(50).
  shortName: z.string().trim().min(1, "Short name is required").max(50),
});
