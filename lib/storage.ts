// Client for the Combined Storage service (github.com/andycqos74/combinedstorage).
// The CMS uploads image bytes here and stores the returned public CDN URL on the
// widget. Combined Storage authenticates with an admin session cookie, so we log
// in once, cache the cookie, and re-authenticate on a 401.

type StorageConfig = {
  base: string;
  username: string;
  password: string;
  parent: string;
};

let cookieCache: string | null = null;

function readConfig(): StorageConfig | null {
  const base = process.env.STORAGE_BASE_URL?.replace(/\/$/, "");
  const username = process.env.STORAGE_USERNAME;
  const password = process.env.STORAGE_PASSWORD;
  if (!base || !username || !password) return null;
  return { base, username, password, parent: process.env.STORAGE_UPLOAD_PARENT || "root" };
}

export function isStorageConfigured(): boolean {
  return readConfig() !== null;
}

async function login(cfg: StorageConfig): Promise<string> {
  const res = await fetch(`${cfg.base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: cfg.username, password: cfg.password }),
  });
  if (!res.ok) throw new Error(`Storage login failed (${res.status})`);
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("Storage login returned no session cookie");
  // Keep just "name=value" (drop Path/HttpOnly/… attributes).
  cookieCache = setCookie.split(";")[0];
  return cookieCache;
}

export type UploadResult = { url: string };

export async function uploadImage(
  bytes: Uint8Array<ArrayBuffer>,
  filename: string,
  mimeType: string,
): Promise<UploadResult> {
  const cfg = readConfig();
  if (!cfg) throw new Error("Combined Storage is not configured");

  const url = `${cfg.base}/api/files/${encodeURIComponent(cfg.parent)}/upload?name=${encodeURIComponent(filename)}`;
  // Wrap in a Blob so fetch sets Content-Type + Content-Length (which the storage
  // server reads for the file's size and mime).
  const body = new Blob([bytes], { type: mimeType || "application/octet-stream" });
  const send = (cookie: string) =>
    fetch(url, { method: "POST", headers: { Cookie: cookie }, body });

  let res = await send(cookieCache ?? (await login(cfg)));
  if (res.status === 401) {
    cookieCache = null;
    res = await send(await login(cfg));
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  const dto = (await res.json()) as { url?: string | null };
  if (!dto.url) throw new Error("Storage did not return a public URL");
  return { url: dto.url };
}
