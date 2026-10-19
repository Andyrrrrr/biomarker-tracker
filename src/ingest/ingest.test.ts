import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { reports, results } from "@/db/schema";
import { seedCatalog } from "@/db/seed/seed";
import { testDb } from "@/test/db";
import { applyImport, BlockedImportError } from "./apply";
import { blockers, planImport } from "./plan";
import type { Staging } from "./staging";

const quest: Staging = {
  report: { source: "quest", externalId: "OZ1", lab: "Quest Diagnostics", collectedOn: "2020-03-10" },
  results: [
    { name: "HS CRP", value: "<0.2", unit: "mg/L", range: "Optimal <1.0" },
    { name: "NEUTROPHILS", value: "51.0", unit: "%" },
    { name: "ABSOLUTE NEUTROPHILS", value: "2400", unit: "cells/uL", range: "1500-7800" },
    { name: "TESTOSTERONE, FREE", value: "40.5", unit: "pg/mL", range: "46.0-224.0", flag: "L" },
    { name: "IRON BINDING CAPACITY", value: "340", unit: "mcg/dL", range: "250-425", calculated: true },
    { name: "ALKALINE PHOSPHATASE", value: "80", unit: "U/L", range: "36-130" },
  ],
};

const insideTracker = (collectedOn: string): Staging => ({
  report: { source: "insidetracker", externalId: collectedOn, collectedOn },
  results: [
    { name: "hsCRP", value: "0.2", unit: "mg/L", range: "0-3" },
    { name: "Free testosterone", value: "6.1", unit: "ng/dL", range: "4.6 - 22.4" },
    { name: "TSH", value: "2.5", unit: "µIU/L" },
  ],
});

const kinds = (plan: Awaited<ReturnType<typeof planImport>>) =>
  Object.fromEntries(plan.items.map((i) => [i.row.name, i.kind]));

describe("ingest", () => {
  let db: Db;
  beforeEach(async () => {
    db = await testDb();
  });

  it("seeding twice adds nothing the second time", async () => {
    expect(await seedCatalog(db)).toEqual({ categories: 0, biomarkers: 0, categoryLinks: 0, aliases: 0 });
  });

  it("matches lab names, keeping Quest's bare percentages apart from counts", async () => {
    const plan = await planImport(db, quest);
    expect(blockers(plan)).toEqual([]);
    const slugs = Object.fromEntries(
      plan.items.map((i) => [i.row.name, "biomarker" in i ? i.biomarker.slug : null]),
    );
    expect(slugs).toEqual({
      "HS CRP": "hs-crp",
      NEUTROPHILS: "neutrophils-percent",
      "ABSOLUTE NEUTROPHILS": "neutrophils",
      "TESTOSTERONE, FREE": "testosterone-free",
      "IRON BINDING CAPACITY": "tibc",
      "ALKALINE PHOSPHATASE": "alkaline-phosphatase",
    });
  });

  it("stores the comparator, the printed value and the lab's range", async () => {
    await applyImport(db, quest);
    const rows = await db.select().from(results);
    const crp = rows.find((r) => r.rawName === "HS CRP")!;
    expect(crp).toMatchObject({ valueNumeric: 0.2, comparator: "<", reportedValue: "<0.2", labRangeLow: null });
    const tibc = rows.find((r) => r.rawName === "IRON BINDING CAPACITY")!;
    expect(tibc).toMatchObject({ isCalculated: true, labRangeLow: 250, labRangeHigh: 425 });
  });

  it("is idempotent: applying the same file twice adds nothing", async () => {
    await applyImport(db, quest);
    const second = await applyImport(db, quest);
    expect(second.inserted).toBe(0);
    expect(second.skippedIdentical).toBe(quest.results.length);
    expect(await db.select().from(results)).toHaveLength(quest.results.length);
  });

  it("lets a lab report win over InsideTracker on the same day, in either order", async () => {
    // InsideTracker first, then Quest replaces it.
    await applyImport(db, insideTracker("2020-03-10"));
    const plan = await planImport(db, quest);
    expect(kinds(plan)["HS CRP"]).toBe("replaces");
    await applyImport(db, quest);
    const crp = await db.select().from(results).where(eq(results.rawName, "HS CRP"));
    expect(crp).toHaveLength(1);
    expect((await db.select().from(results).where(eq(results.rawName, "hsCRP")))).toHaveLength(0);

    // Re-running InsideTracker now finds those markers covered.
    // (Its report stays: it was stored before Quest arrived.)
    const again = await planImport(db, insideTracker("2020-03-10"));
    expect(kinds(again)).toMatchObject({ hsCRP: "covered", "Free testosterone": "covered", TSH: "identical" });
  });

  it("doesn't store an empty report when a lab report covers everything", async () => {
    await applyImport(db, quest);
    const summary = await applyImport(db, {
      ...insideTracker("2020-03-10"),
      results: [{ name: "hsCRP", value: "0.2", unit: "mg/L" }],
    });
    expect(summary).toMatchObject({ reportId: null, inserted: 0, skippedCovered: 1 });
    expect(await db.select().from(reports)).toHaveLength(1);
  });

  it("converts InsideTracker's units into the biomarker's", async () => {
    await applyImport(db, insideTracker("2019-09-01"));
    const rows = await db.select().from(results);
    expect(rows.find((r) => r.rawName === "Free testosterone")).toMatchObject({
      valueNumeric: 61,
      reportedValue: "6.1",
      reportedUnit: "ng/dL",
    });
    expect(rows.find((r) => r.rawName === "TSH")).toMatchObject({ valueNumeric: 2.5 });
  });

  it("blocks unmatched names, unknown units, duplicates and changed values", async () => {
    await applyImport(db, quest);
    const bad: Staging = {
      report: quest.report,
      results: [
        { name: "MYSTERY MARKER", value: "1" },
        { name: "GLUCOSE", value: "5.2", unit: "mmol/L" },
        { name: "ALBUMIN", value: "4.8", unit: "g/dL" },
        { name: "ALBUMIN", value: "4.9", unit: "g/dL" },
        { name: "HS CRP", value: "0.4", unit: "mg/L" },
        { name: "GGT", value: "SEE NOTE:", unit: "U/L" },
      ],
    };
    const plan = await planImport(db, bad);
    expect(plan.items.map((i) => i.kind)).toEqual([
      "unmatched",
      "unit",
      "new",
      "duplicate",
      "conflict",
      "invalid",
    ]);
    await expect(applyImport(db, bad)).rejects.toBeInstanceOf(BlockedImportError);
    // Nothing was written.
    expect(await db.select().from(results)).toHaveLength(quest.results.length);
  });

  it("replaces a changed value only when asked", async () => {
    await applyImport(db, quest);
    const fixed: Staging = { ...quest, results: [{ name: "HS CRP", value: "0.3", unit: "mg/L" }] };
    const summary = await applyImport(db, fixed, { replaceConflicts: true });
    expect(summary.conflictsReplaced).toBe(1);
    const crp = await db.select().from(results).where(eq(results.rawName, "HS CRP"));
    expect(crp).toMatchObject([{ valueNumeric: 0.3, comparator: null }]);
  });

  it("keeps two same-rank reports from one day side by side", async () => {
    await applyImport(db, quest);
    const second: Staging = {
      report: { ...quest.report, externalId: "OZ2" },
      results: [{ name: "HS CRP", value: "0.3", unit: "mg/L" }],
    };
    const plan = await planImport(db, second);
    expect(plan.items[0]).toMatchObject({ kind: "new", sameDay: [{ externalId: "OZ1" }] });
  });
});
