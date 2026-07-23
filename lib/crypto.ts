// AES-256-GCM encryption for external data-source passwords at rest.
import crypto from "node:crypto";

function key(): Buffer {
  const b64 = process.env.DATASOURCE_ENC_KEY;
  if (!b64) throw new Error("DATASOURCE_ENC_KEY is not set");
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) {
    throw new Error("DATASOURCE_ENC_KEY must be base64 of exactly 32 bytes");
  }
  return k;
}

// Returns "iv:tag:ciphertext", each part base64.
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivb, tagb, encb] = payload.split(":");
  if (!ivb || !tagb || !encb) throw new Error("Malformed encrypted secret");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivb, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagb, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encb, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
