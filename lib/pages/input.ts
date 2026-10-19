import { z } from "zod";

export const pageInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z.string().trim().max(80).optional(),
  content: z.string().default(""),
});
