import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { shareLinks } from "@/db/schema";
import { hashShareToken, looksLikeShareToken, newShareToken } from "@/lib/share-tokens";
import { isOwnerEmail, signInSkipped } from "@/lib/owner";
import { testDb } from "@/test/db";
import {
  createShareLink,
  deleteShareLink,
  findActiveShareLink,
  listShareLinks,
  recordShareOpen,
  revokeShareLink,
  shareStatus,
} from "./links";

const DAY = 24 * 3600 * 1000;
const now = new Date("2026-01-15T12:00:00Z");
const inDays = (n: number) => new Date(now.getTime() + n * DAY);

describe("share tokens", () => {
  it("are 256-bit, URL-safe and different every time", () => {
    const a = newShareToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(looksLikeShareToken(a)).toBe(true);
    expect(newShareToken()).not.toBe(a);
  });

  it("hash the same way every time, and not to the token itself", () => {
    const t = newShareToken();
    expect(hashShareToken(t)).toBe(hashShareToken(t));
    expect(hashShareToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashShareToken(t)).not.toContain(t);
  });

  it("reject anything that isn't token-shaped", () => {
    expect(looksLikeShareToken("")).toBe(false);
    expect(looksLikeShareToken("../etc/passwd")).toBe(false);
    expect(looksLikeShareToken("a".repeat(44))).toBe(false);
  });
});

describe("isOwnerEmail", () => {
  it("matches the owner's address, ignoring case and spaces", () => {
    expect(isOwnerEmail("Andy@Example.com", " andy@example.com ")).toBe(true);
    expect(isOwnerEmail("someone@example.com", "andy@example.com")).toBe(false);
  });

  it("refuses everyone when no owner is configured", () => {
    expect(isOwnerEmail("andy@example.com", undefined)).toBe(false);
    expect(isOwnerEmail("andy@example.com", "")).toBe(false);
    expect(isOwnerEmail(undefined, "andy@example.com")).toBe(false);
  });
});

describe("signInSkipped", () => {
  const on = { DEV_SKIP_SIGN_IN: "true", OWNER_EMAIL: "andy@example.com" };
  it("works only under next dev", () => {
    expect(signInSkipped({ ...on, NODE_ENV: "development" })).toBe(true);
    expect(signInSkipped({ ...on, NODE_ENV: "production" })).toBe(false);
    expect(signInSkipped({ ...on, NODE_ENV: "test" })).toBe(false);
  });
  it("is off unless asked for, and needs an owner", () => {
    expect(signInSkipped({ NODE_ENV: "development", OWNER_EMAIL: "andy@example.com" })).toBe(false);
    expect(signInSkipped({ NODE_ENV: "development", DEV_SKIP_SIGN_IN: "1", OWNER_EMAIL: "a@b.c" })).toBe(false);
    expect(signInSkipped({ NODE_ENV: "development", DEV_SKIP_SIGN_IN: "true" })).toBe(false);
  });
});

describe("share links", () => {
  let db: Db;
  beforeEach(async () => {
    db = await testDb();
  });

  it("keeps the token for copying and looks links up by its hash", async () => {
    const { link, token } = await createShareLink(db, { label: "Dr. Lee", expiresAt: inDays(30) });
    const [row] = await db.select().from(shareLinks);
    expect(row).toMatchObject({ label: "Dr. Lee", token, tokenHash: hashShareToken(token) });
    expect(link.id).toBe(row.id);
  });

  it("opens with the right token while active", async () => {
    const { link, token } = await createShareLink(db, { label: "Dr. Lee", expiresAt: inDays(30) });
    expect(await findActiveShareLink(db, token, now)).toMatchObject({ id: link.id });
    expect(await findActiveShareLink(db, newShareToken(), now)).toBeNull();
    expect(await findActiveShareLink(db, "nonsense", now)).toBeNull();
  });

  it("stops working when it expires", async () => {
    const { token } = await createShareLink(db, { label: "Dr. Lee", expiresAt: inDays(7) });
    expect(await findActiveShareLink(db, token, inDays(6))).not.toBeNull();
    expect(await findActiveShareLink(db, token, inDays(7))).toBeNull();
  });

  it("never expires without an expiry date, but can still be revoked and then deleted", async () => {
    const { link, token } = await createShareLink(db, { label: "Dr. Lee", expiresAt: null });
    expect(await findActiveShareLink(db, token, inDays(10_000))).toMatchObject({ id: link.id });
    await deleteShareLink(db, link.id, inDays(10_000));
    expect(await listShareLinks(db)).toHaveLength(1);
    await revokeShareLink(db, link.id, now);
    expect(await findActiveShareLink(db, token, now)).toBeNull();
    await deleteShareLink(db, link.id, now);
    expect(await listShareLinks(db)).toHaveLength(0);
  });

  it("stops working once revoked, and revoking twice keeps the first time", async () => {
    const { link, token } = await createShareLink(db, { label: "Dr. Lee", expiresAt: inDays(30) });
    await revokeShareLink(db, link.id, now);
    await revokeShareLink(db, link.id, inDays(1));
    expect(await findActiveShareLink(db, token, now)).toBeNull();
    const [row] = await listShareLinks(db);
    expect(row.revokedAt).toEqual(now);
    expect(shareStatus(row, now)).toBe("revoked");
  });

  it("deletes only dead links", async () => {
    const { link: live } = await createShareLink(db, { label: "Live", expiresAt: inDays(30) });
    const { link: expired } = await createShareLink(db, { label: "Expired", expiresAt: inDays(-1) });
    const { link: revoked } = await createShareLink(db, { label: "Revoked", expiresAt: inDays(30) });
    await revokeShareLink(db, revoked.id, now);
    for (const l of [live, expired, revoked]) await deleteShareLink(db, l.id, now);
    expect((await listShareLinks(db)).map((l) => l.label)).toEqual(["Live"]);
  });

  it("counts opens", async () => {
    const { link } = await createShareLink(db, { label: "Dr. Lee", expiresAt: inDays(30) });
    await recordShareOpen(db, link.id, now);
    await recordShareOpen(db, link.id, inDays(1));
    const [row] = await listShareLinks(db);
    expect(row).toMatchObject({ openCount: 2, lastOpenedAt: inDays(1) });
  });

  it("reports status", () => {
    expect(shareStatus({ expiresAt: inDays(1), revokedAt: null }, now)).toBe("active");
    expect(shareStatus({ expiresAt: inDays(-1), revokedAt: null }, now)).toBe("expired");
    expect(shareStatus({ expiresAt: null, revokedAt: null }, now)).toBe("active");
    expect(shareStatus({ expiresAt: null, revokedAt: now }, now)).toBe("revoked");
  });
});
