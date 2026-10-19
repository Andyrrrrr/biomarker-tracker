import { createHash, randomBytes } from "node:crypto";

// A share link's secret: 32 random bytes (256 bits), URL-safe. Unguessable, so the link alone is
// the credential. Expiry and revocation are what limit it (see docs/decisions/).
export function newShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Cheap shape check before touching the database.
export function looksLikeShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
