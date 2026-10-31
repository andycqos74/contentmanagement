// Shared helpers for the Fixtures admin API routes: validate/normalise the
// fixture and result payloads. The content-DB pool is shared with News.
import { z } from "zod";
import type { FixtureInput, ResultInput } from "./repository";

export { getContentPool } from "@/lib/news/service";

const optionalText = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : null));

const id = (label: string) =>
  z.coerce.number({ error: `${label} is required` }).int().positive(`${label} is required`);

// Fixture editor payload.
export const fixtureInputSchema = z
  .object({
    Date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
    KickOff: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Kick-off must be a time like 15:00"),
    HomeClubID: id("Home club"),
    AwayClubID: id("Away club"),
    SeasonID: id("Season"),
    CompetitionID: id("Competition"),
    CupRoundID: z.coerce.number().int().nullable().optional(),
    AlternateVenue: optionalText,
    SeasonTicket: optionalText,
    AddInfo: optionalText,
    AlbumID: optionalText,
    EmbedCode: optionalText,
    SCEmbedURL: optionalText,
  })
  .refine((v) => v.HomeClubID !== v.AwayClubID, {
    message: "Home and away clubs must be different",
    path: ["AwayClubID"],
  });

export type FixtureFormInput = z.infer<typeof fixtureInputSchema>;

export function toFixtureInput(v: FixtureFormInput): FixtureInput {
  return {
    FixtureDate: `${v.Date} ${v.KickOff}:00`,
    HomeClubID: v.HomeClubID,
    AwayClubID: v.AwayClubID,
    SeasonID: v.SeasonID,
    CompetitionID: v.CompetitionID,
    CupRoundID: v.CupRoundID && v.CupRoundID > 0 ? v.CupRoundID : null,
    AlternateVenue: v.AlternateVenue,
    SeasonTicket: v.SeasonTicket,
    AddInfo: v.AddInfo,
    AlbumID: v.AlbumID,
    EmbedCode: v.EmbedCode,
    SCEmbedURL: v.SCEmbedURL,
  };
}

const goals = z.coerce.number().int().min(0, "Scores can't be negative").max(99, "Score looks too high");

// Result payload: either postponed, or both final scores (crowd optional).
export const resultInputSchema = z
  .object({
    postponed: z.boolean().default(false),
    home: z.union([z.null(), goals]).optional(),
    away: z.union([z.null(), goals]).optional(),
    crowd: z
      .union([z.null(), z.coerce.number().int().min(0, "Crowd can't be negative").max(200000)])
      .optional(),
  })
  .refine((v) => v.postponed || (v.home != null && v.away != null), {
    message: "Enter both scores, or mark the match as postponed",
  });

export function toResultInput(v: z.infer<typeof resultInputSchema>): ResultInput {
  return {
    postponed: v.postponed,
    home: v.postponed ? null : (v.home ?? null),
    away: v.postponed ? null : (v.away ?? null),
    crowd: v.crowd ?? null,
  };
}

export function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
