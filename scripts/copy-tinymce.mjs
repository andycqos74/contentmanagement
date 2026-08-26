// Copies the self-hosted TinyMCE distribution into public/ so the editor loads
// entirely from our own origin (GPL, no cloud/API key). Run from postinstall.
// Idempotent: the target is wiped and recopied each time.
import { cp, rm, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "tinymce");
const dest = join(root, "public", "tinymce");

try {
  await access(src);
} catch {
  // tinymce not installed yet (e.g. `npm install` still resolving) — skip quietly.
  console.warn("[copy-tinymce] node_modules/tinymce not found; skipping copy.");
  process.exit(0);
}

await rm(dest, { recursive: true, force: true });
await cp(src, dest, { recursive: true });
console.log(`[copy-tinymce] copied TinyMCE -> ${dest}`);
