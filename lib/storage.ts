// Client for uploading widget images to external storage and getting back a
// public URL to store on the widget. Two backends are supported:
//
//   - "webdav"   : plain WebDAV (HTTP PUT + Basic Auth). Auto-selected when
//                  STORAGE_BASE_URL points at a `/dav` endpoint. The public URL
//                  defaults to the same path (override with STORAGE_PUBLIC_URL).
//   - "combined" : the Combined Storage JSON API (github.com/andycqos74/
//                  combinedstorage): admin-session login + /api/files upload.
//
// Select explicitly with STORAGE_TYPE=webdav|combined, otherwise it's inferred
// from the URL.
import { XMLParser } from "fast-xml-parser";
import { nanoid } from "nanoid";

type Mode = "webdav" | "combined";

type StorageConfig = {
  base: string; // upload endpoint base (no trailing slash)
  publicBase: string; // base the files are publicly served from (non-proxy mode)
  username: string;
  password: string;
  parent: string; // "root" or a sub-path/folder
  mode: Mode;
  proxy: boolean; // serve files through the CMS (/api/media) instead of a direct URL
};

// Combined Storage session cookie cache (unused in webdav mode).
let cookieCache: string | null = null;

// Remove a trailing `/dav` mount segment so the public (read) base points at the
// non-authenticated path. A WebDAV mount at https://host/dav is typically served
// publicly (no login) at https://host, so that is the friendly URL to store.
function stripDavSegment(url: string): string {
  return url.replace(/\/dav$/i, "");
}

function readConfig(): StorageConfig | null {
  const base = process.env.STORAGE_BASE_URL?.replace(/\/+$/, "");
  const username = process.env.STORAGE_USERNAME;
  const password = process.env.STORAGE_PASSWORD;
  if (!base || !username || !password) return null;

  const explicit = process.env.STORAGE_TYPE?.toLowerCase();
  const mode: Mode =
    explicit === "webdav" || explicit === "combined"
      ? explicit
      : /\/dav(\/|$)/i.test(base)
        ? "webdav"
        : "combined";

  // Public read base: explicit override wins; otherwise default to the friendly
  // (non-`/dav`) URL in webdav mode so stored image links never require a login.
  const publicBase = (
    process.env.STORAGE_PUBLIC_URL || (mode === "webdav" ? stripDavSegment(base) : base)
  ).replace(/\/+$/, "");

  // Proxy mode: the CMS reads files from storage (with its credentials) and serves
  // them from /api/media, so images always load with no CDN login. On by default
  // for WebDAV (whose /dav mount needs auth); Combined Storage already has public
  // /f/<token> URLs so it stays direct. Force with STORAGE_PROXY=true|false.
  const proxyEnv = process.env.STORAGE_PROXY?.toLowerCase();
  const proxy = proxyEnv === "true" ? true : proxyEnv === "false" ? false : mode === "webdav";

  return {
    base,
    publicBase,
    username,
    password,
    parent: process.env.STORAGE_UPLOAD_PARENT || "root",
    mode,
    proxy,
  };
}

export function isStorageConfigured(): boolean {
  return readConfig() !== null;
}

// Absolute CMS base for building /api/media URLs (empty → relative URLs, which
// still resolve correctly inside the embed iframe and the admin).
function mediaBase(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
}

// The public (proxy) URL for a storage file at `relPath` (a decoded relative path).
function proxyUrl(relPath: string): string {
  const enc = relPath.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  return `${mediaBase()}/api/media/${enc}`;
}

// The public URL for a storage file given its decoded relative path.
export function publicFileUrl(relPath: string): string {
  const cfg = readConfig();
  if (cfg?.proxy) return proxyUrl(relPath);
  const base = cfg?.publicBase ?? "";
  return `${base}/${relPath.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}`;
}

// A rewriter that maps a URL under the authenticated storage base to the public
// (friendly) base, or null when there is nothing to rewrite (no config, or the
// two bases are identical).
function publicRewriter(): ((url: string) => string) | null {
  const cfg = readConfig();
  if (!cfg) return null;
  const { base, publicBase, proxy } = cfg;
  const dec = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  if (proxy) {
    // Any URL under the /dav base OR its non-/dav (legacy friendly) form becomes a
    // CMS /api/media URL, so previously-stored links start loading too.
    const stripped = stripDavSegment(base);
    const prefixes = base === stripped ? [base] : [base, stripped];
    return (url: string) => {
      if (typeof url !== "string") return url;
      for (const pre of prefixes) {
        if (url === pre) return proxyUrl("");
        if (url.startsWith(pre + "/")) {
          return proxyUrl(url.slice(pre.length + 1).split("/").map(dec).join("/"));
        }
      }
      return url;
    };
  }

  if (base === publicBase) return null;
  return (url: string) => {
    if (typeof url !== "string") return url;
    if (url === base) return publicBase;
    if (url.startsWith(base + "/")) return publicBase + url.slice(base.length);
    return url;
  };
}

// Rewrite a single URL to its public form (no-op if it isn't a storage URL).
export function toPublicUrl(url: string): string {
  const rewrite = publicRewriter();
  return rewrite ? rewrite(url) : url;
}

// Deep-rewrite every storage URL found in arbitrary JSON (widget settings/items)
// so a `/dav` link can never be shipped to an embed. Only strings that begin with
// the exact storage base are touched, so it is safe on any value.
export function rewritePublicUrls<T>(value: T): T {
  const rewrite = publicRewriter();
  if (!rewrite) return value;
  const visit = (v: unknown): unknown => {
    if (typeof v === "string") return rewrite(v);
    if (Array.isArray(v)) return v.map(visit);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = visit(val);
      return out;
    }
    return v;
  };
  return visit(value) as T;
}

export type UploadResult = { url: string };

export async function uploadImage(
  bytes: Uint8Array<ArrayBuffer>,
  filename: string,
  mimeType: string,
): Promise<UploadResult> {
  const cfg = readConfig();
  if (!cfg) throw new Error("Image storage is not configured");
  return cfg.mode === "webdav"
    ? uploadWebdav(cfg, bytes, filename, mimeType)
    : uploadCombined(cfg, bytes, filename, mimeType);
}

// Sub-path prefix ("" for root), normalised without leading/trailing slashes.
function subPath(parent: string): string {
  if (!parent || parent === "root" || parent === "/") return "";
  return parent.replace(/^\/+|\/+$/g, "") + "/";
}

// A collision-resistant, URL-safe object name derived from the original.
function uniqueName(filename: string): string {
  const safe =
    (filename || "upload")
      .toLowerCase()
      .replace(/[^a-z0-9.\-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "upload";
  return `${nanoid(8)}-${safe}`;
}

async function uploadWebdav(
  cfg: StorageConfig,
  bytes: Uint8Array<ArrayBuffer>,
  filename: string,
  mimeType: string,
): Promise<UploadResult> {
  const path = subPath(cfg.parent) + uniqueName(filename);
  const auth = "Basic " + Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
  const res = await fetch(`${cfg.base}/${path}`, {
    method: "PUT",
    headers: { Authorization: auth, "Content-Type": mimeType || "application/octet-stream" },
    body: new Blob([bytes], { type: mimeType || "application/octet-stream" }),
  });
  // 201 Created (new), 204/200 (overwrite) are all success.
  if (![200, 201, 204].includes(res.status)) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `WebDAV upload failed (${res.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`,
    );
  }
  return { url: publicFileUrl(path) };
}

async function combinedLogin(cfg: StorageConfig): Promise<string> {
  const res = await fetch(`${cfg.base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: cfg.username, password: cfg.password }),
  });
  if (!res.ok) throw new Error(`Storage login failed (${res.status})`);
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("Storage login returned no session cookie");
  cookieCache = setCookie.split(";")[0];
  return cookieCache;
}

async function uploadCombined(
  cfg: StorageConfig,
  bytes: Uint8Array<ArrayBuffer>,
  filename: string,
  mimeType: string,
): Promise<UploadResult> {
  const url = `${cfg.base}/api/files/${encodeURIComponent(cfg.parent)}/upload?name=${encodeURIComponent(filename)}`;
  const body = new Blob([bytes], { type: mimeType || "application/octet-stream" });
  const send = (cookie: string) =>
    fetch(url, { method: "POST", headers: { Cookie: cookie }, body });

  let res = await send(cookieCache ?? (await combinedLogin(cfg)));
  if (res.status === 401) {
    cookieCache = null;
    res = await send(await combinedLogin(cfg));
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  const dto = (await res.json()) as { url?: string | null };
  if (!dto.url) throw new Error("Storage did not return a public URL");
  return { url: dto.url };
}

/* ------------------------------ Browsing ------------------------------ */

export type StorageEntry = {
  name: string;
  isDir: boolean;
  path: string; // navigation key (webdav: relative path; combined: folder id)
  url: string | null; // public URL (files only)
  size?: number;
  mime?: string;
  modified?: number; // last-modified epoch ms (webdav only)
};

export type StorageListing = {
  path: string;
  parentPath: string | null;
  entries: StorageEntry[];
};

export async function listStorage(path: string): Promise<StorageListing> {
  const cfg = readConfig();
  if (!cfg) throw new Error("Image storage is not configured");
  return cfg.mode === "webdav" ? listWebdav(cfg, path) : listCombined(cfg, path);
}

function normalizeRel(path: string): string {
  return (path || "").replace(/^\/+|\/+$/g, "");
}

function parentOf(rel: string): string | null {
  if (!rel) return null;
  const i = rel.lastIndexOf("/");
  return i === -1 ? "" : rel.slice(0, i);
}

function sortEntries(entries: StorageEntry[]): StorageEntry[] {
  return entries.sort((a, b) =>
    a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1,
  );
}

const xmlParser = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true });

function basePathPrefix(cfg: StorageConfig): string {
  try {
    return new URL(cfg.base).pathname.replace(/\/+$/, ""); // e.g. "/dav"
  } catch {
    return "";
  }
}

async function listWebdav(cfg: StorageConfig, path: string): Promise<StorageListing> {
  const rel = normalizeRel(path);
  const url = `${cfg.base}/${rel ? rel + "/" : ""}`;
  const auth = "Basic " + Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
  const res = await fetch(url, {
    method: "PROPFIND",
    headers: { Authorization: auth, Depth: "1", "Content-Type": "application/xml" },
    body: `<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop><displayname/><resourcetype/><getcontentlength/><getcontenttype/><getlastmodified/></prop></propfind>`,
  });
  if (res.status !== 207) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Browse failed (${res.status})${detail ? `: ${detail.slice(0, 160)}` : ""}`);
  }
  const entries = parsePropfind(await res.text(), cfg, rel);
  return { path: rel, parentPath: parentOf(rel), entries };
}

function parsePropfind(body: string, cfg: StorageConfig, rel: string): StorageEntry[] {
  const doc = xmlParser.parse(body) as Record<string, unknown>;
  const multistatus = (doc.multistatus ?? {}) as Record<string, unknown>;
  const raw = multistatus.response ?? [];
  const responses = (Array.isArray(raw) ? raw : [raw]) as Array<Record<string, unknown>>;
  const prefix = basePathPrefix(cfg);
  const entries: StorageEntry[] = [];

  for (const r of responses) {
    const href = r.href;
    if (typeof href !== "string") continue;

    let pathname = href;
    try {
      pathname = new URL(href, cfg.base).pathname;
    } catch {
      /* relative href, keep as-is */
    }
    let p = decodeURIComponent(pathname);
    if (prefix && p.startsWith(prefix)) p = p.slice(prefix.length);
    const relPath = p.replace(/^\/+|\/+$/g, "");
    if (relPath === rel) continue; // the collection itself

    const propstatArr = Array.isArray(r.propstat) ? r.propstat : [r.propstat];
    const prop = (propstatArr
      .map((ps) => (ps as Record<string, unknown> | undefined)?.prop)
      .find(Boolean) ?? {}) as Record<string, unknown>;

    const rt = prop.resourcetype;
    const isDir = typeof rt === "object" && rt !== null && "collection" in rt;
    const name =
      (typeof prop.displayname === "string" && prop.displayname) ||
      relPath.split("/").pop() ||
      relPath;
    const size = prop.getcontentlength != null ? Number(prop.getcontentlength) : undefined;
    const mime = typeof prop.getcontenttype === "string" ? prop.getcontenttype : undefined;
    const lm = typeof prop.getlastmodified === "string" ? Date.parse(prop.getlastmodified) : NaN;

    entries.push({
      name,
      isDir,
      path: relPath,
      url: isDir ? null : publicFileUrl(relPath),
      size: Number.isFinite(size) ? size : undefined,
      mime,
      modified: Number.isFinite(lm) ? lm : undefined,
    });
  }
  return sortEntries(entries);
}

async function listCombined(cfg: StorageConfig, path: string): Promise<StorageListing> {
  const folderId = normalizeRel(path) || "root";
  const doList = (cookie: string) =>
    fetch(`${cfg.base}/api/files/${encodeURIComponent(folderId)}`, { headers: { Cookie: cookie } });
  let res = await doList(cookieCache ?? (await combinedLogin(cfg)));
  if (res.status === 401) {
    cookieCache = null;
    res = await doList(await combinedLogin(cfg));
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Browse failed (${res.status})${detail ? `: ${detail.slice(0, 160)}` : ""}`);
  }
  const data = (await res.json()) as {
    folder?: { parentId: string | null };
    children?: Array<{
      id: string;
      name: string;
      type: string;
      url: string | null;
      size?: number;
      mimeType?: string;
    }>;
  };
  const entries: StorageEntry[] = (data.children ?? []).map((c) => ({
    name: c.name,
    isDir: c.type === "folder",
    path: c.id,
    url: c.type === "file" ? c.url : null,
    size: c.size,
    mime: c.mimeType,
  }));
  return { path: folderId, parentPath: data.folder?.parentId ?? null, entries: sortEntries(entries) };
}

/* --------------------------- Gallery folders -------------------------- */

export type GallerySort = "name-asc" | "name-desc" | "newest" | "oldest";
export type GalleryImage = { imageUrl: string; caption: string };

const GALLERY_IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
function isImageEntry(e: StorageEntry): boolean {
  return (e.mime?.startsWith("image/") ?? false) || GALLERY_IMAGE_RE.test(e.name);
}
// A tidy caption from a filename: drop the extension, turn separators into spaces.
function prettyCaption(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

// Short-lived cache of folder listings so public embed traffic doesn't hammer
// the CDN. Keyed by folder+sort; the full list is cached and sliced per limit.
const galleryCache = new Map<string, { at: number; items: GalleryImage[] }>();
const GALLERY_TTL_MS = 60_000;

// Pure transform: keep image files, sort them, and shape them into gallery items.
export function galleryImagesFromEntries(
  entries: StorageEntry[],
  sort: GallerySort,
  limit: number,
): GalleryImage[] {
  const images = entries.filter((e) => !e.isDir && !!e.url && isImageEntry(e));
  images.sort((a, b) => {
    if (sort === "newest" || sort === "oldest") {
      const am = a.modified ?? 0;
      const bm = b.modified ?? 0;
      if (am !== bm) return sort === "newest" ? bm - am : am - bm;
    }
    const cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    return sort === "name-desc" ? -cmp : cmp;
  });
  const items = images.map((e) => ({ imageUrl: e.url as string, caption: prettyCaption(e.name) }));
  return limit > 0 ? items.slice(0, limit) : items;
}

// Live listing of the images in a storage folder, sorted and capped. Used by the
// gallery widget so images added to the folder appear automatically.
export async function listFolderImages(
  path: string,
  sort: GallerySort,
  limit: number,
): Promise<GalleryImage[]> {
  const key = `${path}::${sort}`;
  const now = Date.now();
  const cached = galleryCache.get(key);
  if (cached && now - cached.at < GALLERY_TTL_MS) {
    return limit > 0 ? cached.items.slice(0, limit) : cached.items;
  }

  let entries: StorageEntry[];
  try {
    entries = (await listStorage(path)).entries;
  } catch {
    // On a storage error, serve the last good listing rather than an empty gallery.
    if (cached) return limit > 0 ? cached.items.slice(0, limit) : cached.items;
    return [];
  }

  const all = galleryImagesFromEntries(entries, sort, 0);
  galleryCache.set(key, { at: now, items: all });
  return limit > 0 ? all.slice(0, limit) : all;
}

/* ---------------------------- Media proxy ----------------------------- */

// Fetch a storage file (with the CMS's credentials) for /api/media to stream back
// publicly. WebDAV only — Combined Storage files are already public. Rejects path
// traversal; returns null when unavailable.
export async function fetchStorageFile(relPath: string): Promise<Response | null> {
  const cfg = readConfig();
  if (!cfg || cfg.mode !== "webdav") return null;
  const clean = relPath.replace(/^\/+/, "");
  if (!clean || clean.split("/").some((s) => s === "..")) return null;
  const auth = "Basic " + Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
  const enc = clean.split("/").map(encodeURIComponent).join("/");
  return fetch(`${cfg.base}/${enc}`, { headers: { Authorization: auth } }).catch(() => null);
}
