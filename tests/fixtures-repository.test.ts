import { describe, expect, it } from "vitest";
import { outcome, ukNow, updateLogPages } from "@/lib/fixtures/repository";
import {
  fixtureInputSchema,
  resultInputSchema,
  toFixtureInput,
  toResultInput,
} from "@/lib/fixtures/service";

describe("outcome", () => {
  it("classifies win / draw / loss", () => {
    expect(outcome(2, 1)).toBe("Won");
    expect(outcome(1, 1)).toBe("Drawn");
    expect(outcome(0, 3)).toBe("Lost");
  });
  it("compares numerically, not as strings", () => {
    expect(outcome(10, 9)).toBe("Won");
  });
});

describe("updateLogPages", () => {
  it("refreshes the fixtures page when QOS are involved", () => {
    expect(updateLogPages({ HomeClubID: 1, AwayClubID: 5, CompetitionID: 2 }, false)).toEqual([6]);
    expect(updateLogPages({ HomeClubID: 5, AwayClubID: 1, CompetitionID: 2 }, true)).toEqual([6]);
  });
  it("refreshes league + results pages for a league result", () => {
    expect(updateLogPages({ HomeClubID: 1, AwayClubID: 5, CompetitionID: 11 }, true)).toEqual([6, 5, 3]);
    expect(updateLogPages({ HomeClubID: 4, AwayClubID: 5, CompetitionID: 11 }, true)).toEqual([5, 3]);
  });
  it("does not touch league pages for fixture-only edits", () => {
    expect(updateLogPages({ HomeClubID: 4, AwayClubID: 5, CompetitionID: 11 }, false)).toEqual([]);
  });
});

describe("ukNow", () => {
  it("formats in UK local time (BST in summer)", () => {
    expect(ukNow(new Date("2026-08-01T13:05:09Z"))).toBe("2026-08-01 14:05:09");
  });
  it("formats in UK local time (GMT in winter)", () => {
    expect(ukNow(new Date("2026-12-01T13:05:09Z"))).toBe("2026-12-01 13:05:09");
  });
});

const validFixture = {
  Date: "2026-11-07",
  KickOff: "15:00",
  HomeClubID: 1,
  AwayClubID: 7,
  SeasonID: 20,
  CompetitionID: 11,
  CupRoundID: null,
  AlternateVenue: "  ",
  AddInfo: "Live on TV",
};

describe("fixtureInputSchema", () => {
  it("builds a MySQL datetime and nulls blank text", () => {
    const parsed = fixtureInputSchema.parse(validFixture);
    const f = toFixtureInput(parsed);
    expect(f.FixtureDate).toBe("2026-11-07 15:00:00");
    expect(f.AlternateVenue).toBeNull();
    expect(f.AddInfo).toBe("Live on TV");
    expect(f.CupRoundID).toBeNull();
  });
  it("treats cup round 0 as none", () => {
    const f = toFixtureInput(fixtureInputSchema.parse({ ...validFixture, CupRoundID: 0 }));
    expect(f.CupRoundID).toBeNull();
  });
  it("rejects the same club home and away", () => {
    expect(fixtureInputSchema.safeParse({ ...validFixture, AwayClubID: 1 }).success).toBe(false);
  });
  it("rejects a bad kick-off time", () => {
    expect(fixtureInputSchema.safeParse({ ...validFixture, KickOff: "3pm" }).success).toBe(false);
  });
  it("requires a competition", () => {
    expect(fixtureInputSchema.safeParse({ ...validFixture, CompetitionID: "" }).success).toBe(false);
  });
});

describe("resultInputSchema", () => {
  it("accepts a score with crowd", () => {
    const r = toResultInput(resultInputSchema.parse({ home: 2, away: 0, crowd: 3214 }));
    expect(r).toEqual({ postponed: false, home: 2, away: 0, crowd: 3214 });
  });
  it("keeps a null crowd as null (not 0)", () => {
    const r = toResultInput(resultInputSchema.parse({ home: 1, away: 1, crowd: null }));
    expect(r.crowd).toBeNull();
  });
  it("accepts postponed without scores", () => {
    const r = toResultInput(resultInputSchema.parse({ postponed: true, home: null, away: null }));
    expect(r).toEqual({ postponed: true, home: null, away: null, crowd: null });
  });
  it("requires both scores unless postponed", () => {
    expect(resultInputSchema.safeParse({ home: 1, away: null }).success).toBe(false);
    expect(resultInputSchema.safeParse({}).success).toBe(false);
  });
  it("rejects negative scores", () => {
    expect(resultInputSchema.safeParse({ home: -1, away: 0 }).success).toBe(false);
  });
});
