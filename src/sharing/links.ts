import { and, desc, eq, gt, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { shareLinks, type ShareLink } from "@/db/schema";
import { hashShareToken, looksLikeShareToken, newShareToken } from "@/lib/share-tokens";

export type ShareStatus = "active" | "expired" | "revoked";


export function shareStatus(link: Pick<ShareLink, "expiresAt" | "revokedAt">, now = new Date()): ShareStatus {
  if (link.revokedAt) return "revoked";
  return link.expiresAt && link.expiresAt <= now ? "expired" : "active";
}

// expiresAt: null for a link that never expires.
export async function createShareLink(db: Db, input: { label: string; expiresAt: Date | null }) {
  const token = newShareToken();
  const [link] = await db
    .insert(shareLinks)
    .values({ label: input.label, expiresAt: input.expiresAt, token, tokenHash: hashShareToken(token) })
    .returning();
  return { link, token };
}

export async function listShareLinks(db: Db) {
  return db.select().from(shareLinks).orderBy(desc(shareLinks.createdAt), desc(shareLinks.id));
}

export async function revokeShareLink(db: Db, id: number, now = new Date()) {
  await db
    .update(shareLinks)
    .set({ revokedAt: now })
    .where(and(eq(shareLinks.id, id), isNull(shareLinks.revokedAt)));
}

// Removes a link from the list for good. Only a dead one (revoked or expired): a live link has to
// be revoked first, so nobody loses access by a slip.
export async function deleteShareLink(db: Db, id: number, now = new Date()) {
  await db
    .delete(shareLinks)
    .where(and(eq(shareLinks.id, id), or(isNotNull(shareLinks.revokedAt), lte(shareLinks.expiresAt, now))));
}

// The live link for a token, or null if it's unknown, expired or revoked. Every refusal looks the
// same to the visitor.
export async function findActiveShareLink(db: Db, token: string, now = new Date()) {
  if (!looksLikeShareToken(token)) return null;
  const [link] = await db
    .select()
    .from(shareLinks)
    .where(
      and(
        eq(shareLinks.tokenHash, hashShareToken(token)),
        isNull(shareLinks.revokedAt),
        or(isNull(shareLinks.expiresAt), gt(shareLinks.expiresAt, now)),
      ),
    );
  return link ?? null;
}

// Called when the shared dashboard opens (not on every page, so prefetches don't count).
export async function recordShareOpen(db: Db, id: number, now = new Date()) {
  await db
    .update(shareLinks)
    .set({ lastOpenedAt: now, openCount: sql`${shareLinks.openCount} + 1` })
    .where(eq(shareLinks.id, id));
}
