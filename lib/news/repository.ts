// Data access for News on the external content DB (qosfc). Ported from the
// qos-admin rewrite's Data/NewsRepository.cs (Dapper/C#) to parameterised
// mysql2 queries over a pooled connection to the configured content DataSource.
//
// The legacy views vw_newslist / vw_staffDD / vw_fixturedd were not in the
// schema dump, so the list/lookup queries are reconstructed from the base
// tables. Assumptions that need confirming are marked ASSUMPTION — these match
// the ones flagged in the C# port's HANDOFF.md.
import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

// QOS ClubID in the clubs table. Confirmed from the DB views (they filter on
// HomeClubID/AwayClubID = 1 and ClubShortName = 'QOS'). The fixtures column
// DEFAULT of 14 is a placeholder for an unknown opponent, not QOS.
const QOS_CLUB_ID = 1;

export type NewsListItem = {
  NewsID: number;
  Headline: string | null;
  CategoryShortName: string | null;
  PublishDate: string | null; // pool uses dateStrings:true
  UserID: string | null;
  ImageUrl: string | null;
};

export type NewsItem = {
  NewsID: number;
  CategoryID: number;
  SubjectID: number | null;
  FixtureID: number | null;
  Headline: string | null;
  ItemText: string | null; // HTML body
  PublishDate: string; // MySQL DATETIME string / ISO-ish
  UserID: string | null;
  NewCustomImage: string | null;
  TWPostText: string | null;
  FBPostText: string | null;
  Sticky: number;
};

export type LookupItem = { Id: number; Text: string };

/* ------------------------------ Reads ------------------------------ */

export async function getList(pool: Pool, limit = 50): Promise<NewsListItem[]> {
  // Image resolution mirrors vw_newslist: NewCustomImage, else legacy
  // customImageURL, else the per-category default at /images/category/{id}.jpg.
  const sql = `
    SELECT n.NewsID, n.Headline, n.PublishDate, n.UserID,
           c.CategoryShortName,
           CASE
             WHEN NULLIF(n.NewCustomImage, '') IS NOT NULL THEN n.NewCustomImage
             WHEN NULLIF(n.customImageURL, '') IS NOT NULL THEN n.customImageURL
             ELSE CONCAT('/images/category/', n.CategoryID, '.jpg')
           END AS ImageUrl
    FROM news_items n
    LEFT JOIN news_categories c ON c.CategoryID = n.CategoryID
    ORDER BY n.PublishDate DESC
    LIMIT ?`;
  const [rows] = await pool.query<RowDataPacket[]>(sql, [clampLimit(limit)]);
  return rows as NewsListItem[];
}

export async function getById(pool: Pool, id: number): Promise<NewsItem | null> {
  const sql = `
    SELECT NewsID, CategoryID, SubjectID, FixtureID, Headline, ItemText,
           PublishDate, UserID, NewCustomImage, TWPostText, FBPostText,
           COALESCE(Sticky, 0) AS Sticky
    FROM news_items
    WHERE NewsID = ?`;
  const [rows] = await pool.query<RowDataPacket[]>(sql, [id]);
  return (rows[0] as NewsItem | undefined) ?? null;
}

export async function getCategories(pool: Pool): Promise<LookupItem[]> {
  const sql = `
    SELECT CategoryID AS Id, CategoryShortName AS Text
    FROM news_categories
    WHERE InUse = 1
    ORDER BY CategoryShortName`;
  const [rows] = await pool.query<RowDataPacket[]>(sql);
  return rows as LookupItem[];
}

// ASSUMPTION: "Subject" = current staff (players/management still at the club).
export async function getStaff(pool: Pool): Promise<LookupItem[]> {
  const sql = `
    SELECT StaffID AS Id, CONCAT(FirstName, ' ', Surname) AS Text
    FROM staff
    WHERE LeftClub IS NULL
    ORDER BY Surname, FirstName`;
  const [rows] = await pool.query<RowDataPacket[]>(sql);
  return rows as LookupItem[];
}

// ASSUMPTION: fixtures within the last 12 months + future, newest first,
// formatted "dd/MM/yy Opponent (H|A) - Comp".
export async function getFixtures(pool: Pool): Promise<LookupItem[]> {
  const sql = `
    SELECT f.FixtureID AS Id,
           CONCAT(DATE_FORMAT(f.FixtureDate, '%d/%m/%y'), ' ',
                  CASE WHEN f.HomeClubID = ?
                       THEN CONCAT(COALESCE(ac.ClubShortName, ac.ClubLongName), ' (H)')
                       ELSE CONCAT(COALESCE(hc.ClubShortName, hc.ClubLongName), ' (A)') END,
                  ' - ', comp.CompetitionShortName) AS Text
    FROM fixtures f
    LEFT JOIN clubs hc ON hc.ClubID = f.HomeClubID
    LEFT JOIN clubs ac ON ac.ClubID = f.AwayClubID
    LEFT JOIN competitions comp ON comp.CompetitionID = f.CompetitionID
    WHERE f.FixtureDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    ORDER BY f.FixtureDate DESC`;
  const [rows] = await pool.query<RowDataPacket[]>(sql, [QOS_CLUB_ID]);
  return rows as LookupItem[];
}

/* ------------------------------ Writes ------------------------------ */

// Insert a news item; returns the new NewsID. Social-posting flags are set so
// the site's cron never re-posts (PostedToSM/PostedToTW = 1) — live posting is
// deferred, matching the C# port.
export async function insert(pool: Pool, item: NewsItem): Promise<number> {
  const p = toParams(item);
  const sql = `
    INSERT INTO news_items
        (CategoryID, SubjectID, FixtureID, Headline, ItemText, PublishDate, UserID,
         NewCustomImage, ShortText, ItemTextNoHTML, PodcastURL, SCsetURL, Sticky,
         PostedToSM, PostedToTW, NotificationSent, TWPostText, FBPostText)
    VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, 1, 1, 0, ?, ?)`;
  const [result] = await pool.execute<ResultSetHeader>(sql, [
    p.CategoryID, p.SubjectID, p.FixtureID, p.Headline, p.ItemText, p.PublishDate,
    p.UserID, p.NewCustomImage, p.ShortText, p.ItemTextNoHTML, p.Sticky,
    p.TWPostText, p.FBPostText,
  ]);
  return result.insertId;
}

export async function update(pool: Pool, item: NewsItem): Promise<void> {
  const p = toParams(item);
  const sql = `
    UPDATE news_items SET
        CategoryID = ?, SubjectID = ?, FixtureID = ?,
        Headline = ?, ItemText = ?, PublishDate = ?,
        UserID = ?, NewCustomImage = ?, ShortText = ?,
        ItemTextNoHTML = ?, Sticky = ?,
        TWPostText = ?, FBPostText = ?
    WHERE NewsID = ?`;
  await pool.execute(sql, [
    p.CategoryID, p.SubjectID, p.FixtureID, p.Headline, p.ItemText, p.PublishDate,
    p.UserID, p.NewCustomImage, p.ShortText, p.ItemTextNoHTML, p.Sticky,
    p.TWPostText, p.FBPostText, item.NewsID,
  ]);
}

export async function remove(pool: Pool, id: number): Promise<void> {
  await pool.execute("DELETE FROM news_items WHERE NewsID = ?", [id]);
}

// Mirrors the legacy WriteToUpdateLog — drives the public site's "what changed"
// logic. PageID is mapped from the news category.
export async function writeUpdateLog(
  pool: Pool,
  categoryId: number,
  publishDate: string,
): Promise<void> {
  const pageId = categoryId === 8 ? 7 : categoryId === 25 ? 12 : categoryId === 21 ? 9 : 4;
  const dt = toMysqlDateTime(publishDate);
  const [datePart, timePart] = dt.split(" ");
  await pool.execute(
    "INSERT INTO update_log (UpdateDate, UpdateTime, PageID) VALUES (?, ?, ?)",
    [datePart, timePart, pageId],
  );
}

/* ------------------------------ Helpers ------------------------------ */

function clampLimit(n: number): number {
  return Number.isInteger(n) ? Math.min(Math.max(n, 1), 200) : 50;
}

// Derive the persisted columns from the editable item, matching the C# ToParams:
// null-out non-positive lookup ids, default the author, and derive the plain-text
// summary columns from the HTML body.
function toParams(item: NewsItem) {
  const noHtml = htmlToPlainText(item.ItemText ?? "");
  return {
    CategoryID: item.CategoryID,
    SubjectID: item.SubjectID && item.SubjectID > 0 ? item.SubjectID : null,
    FixtureID: item.FixtureID && item.FixtureID > 0 ? item.FixtureID : null,
    Headline: item.Headline ?? null,
    ItemText: item.ItemText ?? null,
    PublishDate: toMysqlDateTime(item.PublishDate),
    UserID: item.UserID && item.UserID.trim() ? item.UserID.trim() : "admin",
    NewCustomImage: item.NewCustomImage ?? null,
    ShortText: noHtml.length > 75 ? noHtml.slice(0, 75) : noHtml,
    ItemTextNoHTML: noHtml,
    Sticky: item.Sticky ? 1 : 0,
    TWPostText: item.TWPostText ?? null,
    FBPostText: item.FBPostText ?? null,
  };
}

// Strip tags and decode entities to a plain-text summary (ShortText / ItemTextNoHTML).
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  const text = html.replace(/<[\s\S]*?>/g, "");
  return decodeEntities(text).trim();
}

function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  };
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => named[name] ?? m);
}

// Convert an incoming datetime (datetime-local "YYYY-MM-DDTHH:mm", ISO, or a
// MySQL string) into a MySQL DATETIME string "YYYY-MM-DD HH:mm:ss" in local
// wall-clock terms (no timezone shift — the publish time is taken as entered).
export function toMysqlDateTime(value: string): string {
  const s = (value ?? "").trim();
  // Already "YYYY-MM-DD HH:mm[:ss]" or "YYYY-MM-DDTHH:mm[:ss]" — normalise in place.
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/);
  if (m) return `${m[1]} ${m[2]}:${m[3] ?? "00"}`;
  // Date only.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s} 00:00:00`;
  // Fallback: parse and format from the Date's local components.
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid publish date: ${value}`);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
