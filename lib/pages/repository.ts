// Data access for CMS pages on the external content DB (qosfc): the live
// `cms_pages` table. Same pattern as lib/news/repository.ts - parameterised
// mysql2 queries over the pooled connection to the configured content DataSource.
//
// Columns: CMSPageID (PK), CMSPageShortName (<=50, the page's key), CMSPageLongName
// (title), CMSPageContent / NewCMSPageContent (longtext HTML), CMSLastUpdated,
// ImageURL, CMSPageMobileContent. Mobile content and ImageURL are never touched.
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

// The column the editor reads and writes.
// ASSUMPTION: needs confirming against the live site - the table has both
// CMSPageContent and NewCMSPageContent. Change this one constant to switch.
export const CONTENT_COLUMN = "NewCMSPageContent" as "CMSPageContent" | "NewCMSPageContent";

export type PageListItem = {
  CMSPageID: number;
  CMSPageShortName: string;
  CMSPageLongName: string;
  CMSLastUpdated: string | null; // pool uses dateStrings:true
};

export type PageItem = PageListItem & { Content: string };

export async function getList(pool: Pool): Promise<PageListItem[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT CMSPageID, CMSPageShortName, CMSPageLongName, CMSLastUpdated
     FROM cms_pages ORDER BY CMSPageLongName`,
  );
  return rows as PageListItem[];
}

const SELECT_ONE = `SELECT CMSPageID, CMSPageShortName, CMSPageLongName, CMSLastUpdated,
       COALESCE(${CONTENT_COLUMN}, '') AS Content FROM cms_pages`;

export async function getById(pool: Pool, id: number): Promise<PageItem | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_ONE} WHERE CMSPageID = ?`, [id]);
  return (rows[0] as PageItem | undefined) ?? null;
}

export async function getByShortName(pool: Pool, shortName: string): Promise<PageItem | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`${SELECT_ONE} WHERE CMSPageShortName = ?`, [shortName]);
  return (rows[0] as PageItem | undefined) ?? null;
}

// Update only the title and the chosen content column (+ CMSLastUpdated).
export async function update(pool: Pool, id: number, title: string, content: string): Promise<void> {
  await pool.execute(
    `UPDATE cms_pages SET CMSPageLongName = ?, ${CONTENT_COLUMN} = ?, CMSLastUpdated = NOW()
     WHERE CMSPageID = ?`,
    [title, content, id],
  );
}

// Returns the new CMSPageID, or null when the short name is already taken.
export async function insert(
  pool: Pool,
  shortName: string,
  title: string,
  content: string,
): Promise<number | null> {
  const [dupe] = await pool.query<RowDataPacket[]>(
    "SELECT CMSPageID FROM cms_pages WHERE CMSPageShortName = ?",
    [shortName],
  );
  if (dupe.length) return null;
  const [r] = await pool.execute<ResultSetHeader>(
    `INSERT INTO cms_pages (CMSPageShortName, CMSPageLongName, ${CONTENT_COLUMN}, CMSLastUpdated)
     VALUES (?, ?, ?, NOW())`,
    [shortName, title, content],
  );
  return r.insertId;
}
