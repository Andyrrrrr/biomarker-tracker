import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Where a report came from. A lab's own report beats an aggregator's copy of it; see
// SOURCE_RANK in src/lib/sources.ts.
export const reportSource = pgEnum("report_source", [
  "quest",
  "insidetracker",
  "function",
  "manual",
]);

export const resultType = pgEnum("result_type", ["numeric", "qualitative"]);

export const comparator = pgEnum("comparator", ["<", "<=", ">", ">="]);

// Every table has row-level security on and no policies, so Supabase's public API key reads
// nothing (schema.test.ts fails if a table leaves it off). The app connects with the database's
// own connection string, which bypasses RLS.

export const categories = pgTable("categories", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  icon: text(),
  sortOrder: integer().notNull().default(0),
}).enableRLS();

export const biomarkers = pgTable("biomarkers", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  shortName: text(),
  description: text(),
  resultType: resultType().notNull().default("numeric"),
  // Canonical unit; results in other units are converted on ingest (src/lib/units.ts).
  unit: text(),
  // Either end can be empty: "<200" is a high only. No range at all means status "Other".
  rangeLow: doublePrecision(),
  rangeHigh: doublePrecision(),
  // Optional tighter target band, switched on per biomarker.
  optimalEnabled: boolean().notNull().default(false),
  optimalLow: doublePrecision(),
  optimalHigh: doublePrecision(),
  // Qualitative markers: the values that count as normal ("Negative", "None Seen").
  normalValues: text().array(),
  sortOrder: integer().notNull().default(0),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const biomarkerCategories = pgTable(
  "biomarker_categories",
  {
    biomarkerId: integer()
      .notNull()
      .references(() => biomarkers.id, { onDelete: "cascade" }),
    categoryId: integer()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.biomarkerId, t.categoryId] })],
).enableRLS();

// Names labs print for a biomarker. A null source applies to every source; a source-specific
// alias wins, because the same name can mean different things ("BASOPHILS" is a percentage at
// Quest, an absolute count at Function).
export const biomarkerAliases = pgTable(
  "biomarker_aliases",
  {
    id: serial().primaryKey(),
    biomarkerId: integer()
      .notNull()
      .references(() => biomarkers.id, { onDelete: "cascade" }),
    // Stored normalized: see normalizeName in src/lib/names.ts.
    alias: text().notNull(),
    source: reportSource(),
  },
  // One row per alias per source, with "any source" (null) counted as its own source.
  (t) => [
    uniqueIndex("biomarker_aliases_any_source").on(t.alias).where(sql`${t.source} is null`),
    uniqueIndex("biomarker_aliases_per_source")
      .on(t.alias, t.source)
      .where(sql`${t.source} is not null`),
  ],
).enableRLS();

// One lab draw as one source reported it.
export const reports = pgTable(
  "reports",
  {
    id: serial().primaryKey(),
    source: reportSource().notNull(),
    // Quest: the specimen ID. Sources without one: the collection date.
    externalId: text().notNull(),
    lab: text(),
    collectedOn: date({ mode: "string" }).notNull(),
    collectedTime: text(),
    orderingAccount: text(),
    fasting: boolean(),
    sourceFile: text(),
    notes: text(),
    importedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.source, t.externalId), index().on(t.collectedOn)],
).enableRLS();

export const results = pgTable(
  "results",
  {
    id: serial().primaryKey(),
    reportId: integer()
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    biomarkerId: integer()
      .notNull()
      .references(() => biomarkers.id, { onDelete: "restrict" }),
    // In the biomarker's canonical unit. "<0.2" is value 0.2 with comparator "<".
    valueNumeric: doublePrecision(),
    comparator: comparator(),
    // Qualitative results ("Negative").
    valueText: text(),
    // Exactly as the lab printed them, for reference and audit.
    reportedValue: text().notNull(),
    reportedUnit: text(),
    labRangeText: text(),
    labRangeLow: doublePrecision(),
    labRangeHigh: doublePrecision(),
    labFlag: text(),
    isCalculated: boolean().notNull().default(false),
    rawName: text().notNull(),
    notes: text(),
  },
  (t) => [uniqueIndex().on(t.reportId, t.biomarkerId), index().on(t.biomarkerId)],
).enableRLS();

// Read-only links for sharing everything with a doctor. Links are looked up by the token's SHA-256
// hash (src/lib/share-tokens.ts). The token itself is kept so the owner can copy a link again;
// links made before that have only the hash.
export const shareLinks = pgTable("share_links", {
  id: serial().primaryKey(),
  label: text().notNull(),
  tokenHash: text().notNull().unique(),
  token: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp({ withTimezone: true }), // null: never expires
  revokedAt: timestamp({ withTimezone: true }),
  lastOpenedAt: timestamp({ withTimezone: true }),
  openCount: integer().notNull().default(0),
}).enableRLS();

export type Category = typeof categories.$inferSelect;
export type Biomarker = typeof biomarkers.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Result = typeof results.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
export type ReportSource = (typeof reportSource.enumValues)[number];
export type Comparator = (typeof comparator.enumValues)[number];
