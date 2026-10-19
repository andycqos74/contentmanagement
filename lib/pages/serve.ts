import { getContentPool } from "@/lib/news/service";
import { getByShortName } from "./repository";
import { sanitizePageHtml } from "./sanitize";

export type PublicPage = {
  id: number;
  title: string;
  slug: string;
  html: string;
  updatedAt: string | null;
};

// A page by its CMSPageShortName, with HTML whitelisted for public output
// (the legacy content is not sanitised at rest). Null when missing or the
// content DB is unavailable.
export async function getPublicPage(slug: string): Promise<PublicPage | null> {
  const conn = await getContentPool();
  if ("error" in conn) return null;
  try {
    const page = await getByShortName(conn.pool, slug);
    if (!page) return null;
    return {
      id: page.CMSPageID,
      title: page.CMSPageLongName,
      slug: page.CMSPageShortName,
      html: sanitizePageHtml(page.Content),
      updatedAt: page.CMSLastUpdated,
    };
  } catch {
    return null;
  }
}
