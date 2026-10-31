// Data access for Fixtures & Results on the external content DB (qosfc). Ported
// from the legacy qos-admin pages new_FixturesEdit.aspx and
// new_ScoresEditsimple.aspx (VB.NET, string-built SQL) to parameterised mysql2
// queries over the configured content DataSource.
//
// The legacy pages read the vw_editfixtures / vw_editscoressimple views by
// column *position*, and those views are not in the schema dump, so the list is
// rebuilt from the base tables. Lookup tables (clubs, season, competitions,
// cup_rounds) are read positionally exactly as the legacy dropdowns bound them,
// so we don't depend on column names we can't confirm.
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

// QOS ClubID in the clubs table (see lib/news/repository.ts).
export const QOS_CLUB_ID = 1;

// Competition whose results also feed the results_all table (league table
// source). Matches the legacy `If competitionid = 34` branch.
export const RESULTS_ALL_COMPETITION_ID = 34;

// Competition that refreshes the league/table pages in update_log (legacy
// `If competitionid = 11`).
export const LEAGUE_COMPETITION_ID = 11;

// update_log PageIDs used by the legacy pages.
const PAGE_FIXTURES = 6;
const PAGE_LEAGUE = 5;
const PAGE_RESULTS = 3;

// A score of "P" in the scores table marks a postponed fixture.
export const POSTPONED = "P";

export type LookupItem = { Id: number; Text: string };

export type FixtureLookups = {
  clubs: LookupItem[];
  seasons: LookupItem[];
  competitions: LookupItem[];
  cupRounds: LookupItem[];
};

export type FixtureRow = {
  FixtureID: number;
  FixtureDate: string; // "YYYY-MM-DD HH:mm:ss" (pool uses dateStrings:true)
  HomeClubID: number;
  AwayClubID: number;
  SeasonID: number;
  CompetitionID: number;
  CupRoundID: number | null;
  AlternateVenue: string | null;
  SeasonTicket: string | null;
  AddInfo: string | null;
  AlbumID: string | null;
  EmbedCode: string | null;
  SCEmbedURL: string | null;
  HomeFinalScore: string | null;
  AwayFinalScore: string | null;
  Crowd: number | null;
};

export type FixtureInput = {
  FixtureDate: string; // "YYYY-MM-DD HH:mm:ss"
  HomeClubID: number;
  AwayClubID: number;
  SeasonID: number;
  CompetitionID: number;
  CupRoundID: number | null;
  AlternateVenue: string | null;
  SeasonTicket: string | null;
  AddInfo: string | null;
  AlbumID: string | null;
  EmbedCode: string | null;
  SCEmbedURL: string | null;
};

export type ResultInput = {
  postponed: boolean;
  home: number | null;
  away: number | null;
  crowd: number | null;
};

/* ------------------------------ Reads ------------------------------ */

// Read a lookup table positionally: id from column `idCol`, label from
// `textCol` — mirroring the legacy DataValueField/DataTextField bindings.
async function positionalLookup(
  pool: Pool,
  sql: string,
  idCol: number,
  textCol: number,
): Promise<LookupItem[]> {
  const [rows] = await pool.query<RowDataPacket[]>({ sql, rowsAsArray: true });
  return (rows as unknown as unknown[][]).map((r) => ({
    Id: Number(r[idCol]),
    Text: String(r[textCol] ?? r[idCol] ?? ""),
  }));
}

export async function getLookups(pool: Pool): Promise<FixtureLookups> {
  const [clubs, seasons, competitions, cupRounds] = await Promise.all([
    positionalLookup(pool, "SELECT * FROM clubs ORDER BY Division, ClubShortName", 0, 5),
    positionalLookup(pool, "SELECT * FROM season ORDER BY seasonCode ASC", 0, 2),
    positionalLookup(pool, "SELECT * FROM competitions", 0, 2),
    positionalLookup(pool, "SELECT * FROM cup_rounds", 0, 1),
  ]);
  return { clubs, seasons, competitions, cupRounds };
}

// The season of the fixture nearest to today — a sensible default filter that
// rolls over by itself (the legacy code hard-coded the current season).
export async function getCurrentSeasonId(pool: Pool): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT SeasonID FROM fixtures
     ORDER BY ABS(TIMESTAMPDIFF(SECOND, FixtureDate, NOW()))
     LIMIT 1`,
  );
  const id = rows[0]?.SeasonID;
  return id == null ? null : Number(id);
}

const FIXTURE_COLUMNS = `
  f.FixtureID, f.FixtureDate, f.HomeClubID, f.AwayClubID, f.SeasonID,
  f.CompetitionID, f.CupRoundID, f.AlternateVenue, f.SeasonTicket, f.AddInfo,
  f.AlbumID, f.EmbedCode, f.SCEmbedURL,
  s.HomeFinalScore, s.AwayFinalScore, s.Crowd`;

export async function getList(pool: Pool, seasonId: number): Promise<FixtureRow[]> {
  const sql = `
    SELECT ${FIXTURE_COLUMNS}
    FROM fixtures f
    LEFT JOIN scores s ON s.FixtureID = f.FixtureID
    WHERE f.SeasonID = ?
    ORDER BY f.FixtureDate ASC, f.FixtureID ASC`;
  const [rows] = await pool.query<RowDataPacket[]>(sql, [seasonId]);
  return rows.map(normaliseRow);
}

export async function getById(pool: Pool | PoolConnection, id: number): Promise<FixtureRow | null> {
  const sql = `
    SELECT ${FIXTURE_COLUMNS}
    FROM fixtures f
    LEFT JOIN scores s ON s.FixtureID = f.FixtureID
    WHERE f.FixtureID = ?
    LIMIT 1`;
  const [rows] = await pool.query<RowDataPacket[]>(sql, [id]);
  return rows[0] ? normaliseRow(rows[0]) : null;
}

function normaliseRow(r: RowDataPacket): FixtureRow {
  const num = (v: unknown) => (v == null || v === "" ? null : Number(v));
  const str = (v: unknown) => (v == null ? null : String(v));
  return {
    FixtureID: Number(r.FixtureID),
    FixtureDate: String(r.FixtureDate),
    HomeClubID: Number(r.HomeClubID),
    AwayClubID: Number(r.AwayClubID),
    SeasonID: Number(r.SeasonID),
    CompetitionID: Number(r.CompetitionID),
    CupRoundID: num(r.CupRoundID) || null,
    AlternateVenue: str(r.AlternateVenue),
    SeasonTicket: str(r.SeasonTicket),
    AddInfo: str(r.AddInfo),
    AlbumID: str(r.AlbumID),
    EmbedCode: str(r.EmbedCode),
    SCEmbedURL: str(r.SCEmbedURL),
    HomeFinalScore: str(r.HomeFinalScore),
    AwayFinalScore: str(r.AwayFinalScore),
    Crowd: num(r.Crowd),
  };
}

/* ------------------------------ Fixture writes ------------------------------ */

function fixtureParams(f: FixtureInput) {
  return [
    f.HomeClubID, f.AwayClubID, f.SeasonID, f.FixtureDate, f.CompetitionID,
    f.AlternateVenue, f.SeasonTicket ?? "", f.CupRoundID, f.AddInfo ?? "",
    f.EmbedCode, f.SCEmbedURL, f.AlbumID ?? "",
  ];
}

export async function insertFixture(pool: Pool, f: FixtureInput): Promise<number> {
  const [res] = await pool.execute<ResultSetHeader>(
    `INSERT INTO fixtures
       (HomeClubID, AwayClubID, SeasonID, FixtureDate, CompetitionID,
        AlternateVenue, SeasonTicket, CupRoundID, AddInfo,
        EmbedCode, SCEmbedURL, AlbumID)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    fixtureParams(f),
  );
  return res.insertId;
}

export async function updateFixture(pool: Pool, id: number, f: FixtureInput): Promise<boolean> {
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE fixtures SET
       HomeClubID = ?, AwayClubID = ?, SeasonID = ?, FixtureDate = ?,
       CompetitionID = ?, AlternateVenue = ?, SeasonTicket = ?, CupRoundID = ?,
       AddInfo = ?, EmbedCode = ?, SCEmbedURL = ?, AlbumID = ?
     WHERE FixtureID = ?`,
    [...fixtureParams(f), id],
  );
  return res.affectedRows > 0;
}

// Delete a fixture along with its score and results_all rows, so no orphaned
// result is left feeding the league table.
export async function removeFixture(pool: Pool, id: number): Promise<void> {
  await inTransaction(pool, async (conn) => {
    await conn.execute("DELETE FROM results_all WHERE FixtureID = ?", [id]);
    await conn.execute("DELETE FROM scores WHERE FixtureID = ?", [id]);
    await conn.execute("DELETE FROM fixtures WHERE FixtureID = ?", [id]);
  });
}

/* ------------------------------ Result writes ------------------------------ */

type Outcome = "Won" | "Drawn" | "Lost";

// W/D/L for one side given its goals for and against.
export function outcome(goalsFor: number, goalsAgainst: number): Outcome {
  if (goalsFor > goalsAgainst) return "Won";
  if (goalsFor === goalsAgainst) return "Drawn";
  return "Lost";
}

// Save (insert or update) the final score + crowd for a fixture. For the
// results_all competition the two per-club result rows are rebuilt, as the
// legacy page did. Returns the fixture (pre-save) so callers can log updates,
// or null if the fixture doesn't exist.
export async function saveResult(
  pool: Pool,
  fixtureId: number,
  r: ResultInput,
): Promise<FixtureRow | null> {
  return inTransaction(pool, async (conn) => {
    const fx = await getById(conn, fixtureId);
    if (!fx) return null;

    const homeScore = r.postponed ? POSTPONED : String(r.home);
    const awayScore = r.postponed ? POSTPONED : String(r.away);

    const [existing] = await conn.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS n FROM scores WHERE FixtureID = ?",
      [fixtureId],
    );
    if (Number(existing[0]?.n ?? 0) > 0) {
      await conn.execute(
        "UPDATE scores SET HomeFinalScore = ?, AwayFinalScore = ?, Crowd = ? WHERE FixtureID = ?",
        [homeScore, awayScore, r.crowd, fixtureId],
      );
    } else {
      await conn.execute(
        "INSERT INTO scores (FixtureID, HomeFinalScore, AwayFinalScore, Crowd) VALUES (?, ?, ?, ?)",
        [fixtureId, homeScore, awayScore, r.crowd],
      );
    }

    if (fx.CompetitionID === RESULTS_ALL_COMPETITION_ID) {
      // Always clear first so an edited (or newly postponed) result never
      // leaves stale rows behind.
      await conn.execute("DELETE FROM results_all WHERE FixtureID = ?", [fixtureId]);
      if (!r.postponed && r.home != null && r.away != null) {
        // Column names are built from a fixed set (HomeWon/HomeDrawn/…), never
        // from user input.
        const homeCol = `Home${outcome(r.home, r.away)}`;
        const awayCol = `Away${outcome(r.away, r.home)}`;
        await conn.execute(
          `INSERT INTO results_all (FixtureID, ClubID, HomePlayed, ${homeCol}, HomeFor, HomeAgainst)
           VALUES (?, ?, 1, 1, ?, ?)`,
          [fixtureId, fx.HomeClubID, r.home, r.away],
        );
        await conn.execute(
          `INSERT INTO results_all (FixtureID, ClubID, AwayPlayed, ${awayCol}, AwayFor, AwayAgainst)
           VALUES (?, ?, 1, 1, ?, ?)`,
          [fixtureId, fx.AwayClubID, r.away, r.home],
        );
      }
    }
    return fx;
  });
}

// Remove a fixture's result entirely (e.g. entered against the wrong match).
export async function clearResult(pool: Pool, fixtureId: number): Promise<FixtureRow | null> {
  return inTransaction(pool, async (conn) => {
    const fx = await getById(conn, fixtureId);
    if (!fx) return null;
    await conn.execute("DELETE FROM results_all WHERE FixtureID = ?", [fixtureId]);
    await conn.execute("DELETE FROM scores WHERE FixtureID = ?", [fixtureId]);
    return fx;
  });
}

/* ------------------------------ update_log ------------------------------ */

// Which public-site pages need refreshing after a change to this fixture.
// Fixtures page when QOS are involved; for the league competition also the
// league table and results pages (legacy scores page logic).
export function updateLogPages(
  f: { HomeClubID: number; AwayClubID: number; CompetitionID: number },
  includeResults: boolean,
): number[] {
  const pages: number[] = [];
  if (f.HomeClubID === QOS_CLUB_ID || f.AwayClubID === QOS_CLUB_ID) pages.push(PAGE_FIXTURES);
  if (includeResults && f.CompetitionID === LEAGUE_COMPETITION_ID) {
    pages.push(PAGE_LEAGUE, PAGE_RESULTS);
  }
  return pages;
}

export async function writeUpdateLog(pool: Pool, pageIds: number[], now = new Date()): Promise<void> {
  if (pageIds.length === 0) return;
  const [datePart, timePart] = ukNow(now).split(" ");
  const placeholders = pageIds.map(() => "(?, ?, ?)").join(", ");
  await pool.execute(
    `INSERT INTO update_log (UpdateDate, UpdateTime, PageID) VALUES ${placeholders}`,
    pageIds.flatMap((id) => [datePart, timePart, id]),
  );
}

// Current UK wall-clock time as "YYYY-MM-DD HH:mm:ss" (the legacy code shifted
// the server clock by hand; this follows GMT/BST automatically).
export function ukNow(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/* ------------------------------ Helpers ------------------------------ */

async function inTransaction<T>(pool: Pool, fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}
