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
import { nanoid } from "nanoid";

type Mode = "webdav" | "combined";

type StorageConfig = {
  base: string; // upload endpoint base (no trailing slash)
  publicBase: string; // base the files are publicly served from
  username: string;
  password: string;
  parent: string; // "root" or a sub-path/folder
  mode: Mode;
};

// Combined Storage session cookie cache (unused in webdav mode).
let cookieCache: string | null = null;

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

  const publicBase = (process.env.STORAGE_PUBLIC_URL || base).replace(/\/+$/, "");
  return {
    base,
    publicBase,
    username,
    password,
    parent: process.env.STORAGE_UPLOAD_PARENT || "root",
    mode,
  };
}

export function isStorageConfigured(): boolean {
  return readConfig() !== null;
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
  return { url: `${cfg.publicBase}/${path}` };
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
