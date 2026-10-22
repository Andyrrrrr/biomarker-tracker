import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { biomarkerAliases, biomarkerCategories, biomarkers, categories, reports, results } from "@/db/schema";
import { seedCatalog } from "@/db/seed/seed";
import { biomarkerForm, manualReportForm, resultForm } from "@/lib/forms";
import { testDb } from "@/test/db";
import { applyImport } from "./apply";
import {
  addManualReport,
  addResults,
  deleteReport,
  editResult,
  EditError,
  mergeBiomarkers,
  reorderBiomarkers,
  reorderCategories,
  saveBiomarker,
  updateReport,
} from "./edits";
import { planImport } from "./plan";
import type { Staging } from "./staging";

const quest: Staging = {
  report: { source: "quest", externalId: "OZ1", lab: "Quest Diagnostics", collectedOn: "2020-03-10" },
  results: [
    { name: "HS CRP", value: "<0.2", unit: "mg/L", range: "Optimal <1.0" },
    { name: "TESTOSTERONE, FREE", value: "40.5", unit: "pg/mL", range: "46.0-224.0", flag: "L" },
    { name: "ALBUMIN", value: "4.6", unit: "g/dL" },
  ],
};

const manual = (results: Record<string, string>[], collectedOn = "2021-06-01") =>
  manualReportForm.parse({ collectedOn, results });

async function resultsFor(db: Db, slug: string) {
  return db
    .select({ result: results, report: reports })
    .from(results)
    .innerJoin(biomarkers, eq(results.biomarkerId, biomarkers.id))
    .innerJoin(reports, eq(results.reportId, reports.id))
    .where(eq(biomarkers.slug, slug));
}

async function editError(promise: Promise<unknown>) {
  const e = await promise.then(
    () => null,
    (err: unknown) => err,
  );
  expect(e).toBeInstanceOf(EditError);
  return e as EditError;
}

async function biomarkerInput(db: Db, slug: string, changes: Record<string, unknown>) {
  const [b] = await db.select().from(biomarkers).where(eq(biomarkers.slug, slug));
  const str = (n: number | null) => (n === null ? "" : String(n));
  return biomarkerForm.parse({
    name: b.name,
    shortName: b.shortName ?? "",
    unit: b.unit ?? "",
    resultType: b.resultType,
    rangeLow: str(b.rangeLow),
    rangeHigh: str(b.rangeHigh),
    categories: ["heart"],
    ...changes,
  });
}

describe("hand edits", () => {
  let db: Db;
  beforeEach(async () => {
    db = await testDb();
  });

  describe("manual reports", () => {
    it("stores typed results through the ingest path, converting units", async () => {
      const { reportId } = await addManualReport(
        db,
        manual([
          { biomarker: "hs-crp", value: "0.5", unit: "mg/L" },
          { biomarker: "testosterone-free", value: "6.1", unit: "ng/dL" },
        ]),
      );
      const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
      expect(report).toMatchObject({ source: "manual", externalId: "2021-06-01" });
      const [t] = await resultsFor(db, "testosterone-free");
      expect(t.result).toMatchObject({ valueNumeric: 61, reportedValue: "6.1", rawName: "Testosterone, Free" });
    });

    it("makes a separate report for a second entry on the same day", async () => {
      await addManualReport(db, manual([{ biomarker: "hs-crp", value: "0.5", unit: "mg/L" }]));
      await addManualReport(db, manual([{ biomarker: "hs-crp", value: "0.7", unit: "mg/L" }]));
      const ids = (await db.select().from(reports)).map((r) => r.externalId).sort();
      expect(ids).toEqual(["2021-06-01", "2021-06-01-2"]);
    });

    it("reports blockers against the row that caused them and writes nothing", async () => {
      const e = await editError(
        addManualReport(
          db,
          manual([
            { biomarker: "hs-crp", value: "high", unit: "mg/L" },
            { biomarker: "glucose", value: "5.2", unit: "mmol/L" },
            { biomarker: "albumin", value: "4.5", unit: "g/dL" },
            { biomarker: "albumin", value: "4.6", unit: "g/dL" },
          ]),
        ),
      );
      expect(e.fields).toEqual({
        "results.0.value": '"high" isn\'t a number.',
        "results.1.value": 'Unknown unit: reported in "mmol/L", biomarker uses "mg/dL".',
        "results.3.biomarker": "Same biomarker as row 3.",
      });
      expect(await db.select().from(reports)).toHaveLength(0);
    });

    it("replaces a lower-ranked source's result from the same day", async () => {
      await applyImport(db, {
        report: { source: "insidetracker", externalId: "2021-06-01", collectedOn: "2021-06-01" },
        results: [{ name: "hsCRP", value: "0.4", unit: "mg/L" }],
      });
      await addManualReport(db, manual([{ biomarker: "hs-crp", value: "0.45", unit: "mg/L" }]));
      const rows = await resultsFor(db, "hs-crp");
      expect(rows.map((r) => [r.report.source, r.result.valueNumeric])).toEqual([["manual", 0.45]]);
    });
  });

  describe("adding results to a report", () => {
    const rows = (results: Record<string, string>[]) => manual(results).results;

    it("adds new biomarkers and leaves the report's details alone", async () => {
      const { reportId } = await applyImport(db, quest);
      const [before] = await db.select().from(reports);
      await addResults(db, reportId!, rows([{ biomarker: "glucose", value: "92", unit: "mg/dL", range: "65-99" }]));
      const [g] = await resultsFor(db, "glucose");
      expect(g.result).toMatchObject({ reportId, valueNumeric: 92, labRangeLow: 65 });
      expect((await db.select().from(reports))[0]).toEqual(before);
    });

    it("refuses rows the report already has, or a higher-ranked source covers, writing nothing", async () => {
      const { reportId } = await applyImport(db, quest);
      const e = await editError(
        addResults(
          db,
          reportId!,
          rows([
            { biomarker: "glucose", value: "92", unit: "mg/dL" },
            { biomarker: "albumin", value: "4.6", unit: "g/dL" },
            { biomarker: "hs-crp", value: "0.4", unit: "mg/L" },
          ]),
        ),
      );
      expect(e.fields).toEqual({
        "results.1.biomarker": "Already in this report.",
        "results.2.value": "Already stored in this report as <0.2.",
      });
      expect(await resultsFor(db, "glucose")).toHaveLength(0);

      // Quest has hs-CRP that day, so InsideTracker's report can't take one.
      const { reportId: it } = await applyImport(db, {
        report: { source: "insidetracker", externalId: "2020-03-10", collectedOn: "2020-03-10" },
        results: [{ name: "TSH", value: "2.5", unit: "mIU/L" }],
      });
      const covered = await editError(addResults(db, it!, rows([{ biomarker: "hs-crp", value: "0.2", unit: "mg/L" }])));
      expect(covered.fields).toEqual({ "results.0.biomarker": "Quest already has this biomarker that day (<0.2)." });
    });
  });

  describe("editing results", () => {
    beforeEach(async () => {
      await applyImport(db, quest);
    });

    it("re-parses the edited value and keeps the report", async () => {
      const [crp] = await resultsFor(db, "hs-crp");
      await editResult(db, crp.result.id, resultForm.parse({ value: "0.3", unit: "mg/L", flag: "H" }));
      const [after] = await resultsFor(db, "hs-crp");
      expect(after.result).toMatchObject({
        reportId: crp.result.reportId,
        valueNumeric: 0.3,
        comparator: null,
        labFlag: "H",
        rawName: "HS CRP",
      });
      expect(after.report).toEqual(crp.report);
    });

    it("saves a change to notes alone", async () => {
      const [alb] = await resultsFor(db, "albumin");
      await editResult(db, alb.result.id, resultForm.parse({ value: "4.6", unit: "g/dL", notes: "Repeat draw" }));
      const [after] = await resultsFor(db, "albumin");
      expect(after.result.notes).toBe("Repeat draw");
    });

    it("refuses a unit it can't convert and leaves the result alone", async () => {
      const [alb] = await resultsFor(db, "albumin");
      const e = await editError(editResult(db, alb.result.id, resultForm.parse({ value: "46", unit: "g/L" })));
      expect(e.message).toContain("Unknown unit");
      const [after] = await resultsFor(db, "albumin");
      expect(after.result).toEqual(alb.result);
    });
  });

  describe("reports", () => {
    it("updates details without touching the external ID, and deletes with results", async () => {
      const { reportId } = await applyImport(db, quest);
      await updateReport(db, reportId!, {
        collectedOn: "2020-03-11",
        collectedTime: null,
        lab: "Quest",
        fasting: true,
        notes: null,
      });
      const [r] = await db.select().from(reports);
      expect(r).toMatchObject({ collectedOn: "2020-03-11", externalId: "OZ1", fasting: true });
      // Re-importing the lab's file still finds it.
      expect((await planImport(db, quest)).reportExists).toBe(true);

      await deleteReport(db, reportId!);
      expect(await db.select().from(results)).toHaveLength(0);
    });
  });

  describe("biomarkers", () => {
    it("creates one with a unique slug, categories and normalized aliases", async () => {
      const input = biomarkerForm.parse({
        name: "Glucose",
        unit: "mg/dL",
        categories: ["metabolic"],
        aliases: [{ alias: "blood sugar, fasting", source: "" }],
      });
      const slug = await saveBiomarker(db, null, input);
      expect(slug).toBe("glucose-2");
      const [b] = await db.select().from(biomarkers).where(eq(biomarkers.slug, slug));
      const aliases = await db.select().from(biomarkerAliases).where(eq(biomarkerAliases.biomarkerId, b.id));
      expect(aliases).toMatchObject([{ alias: "BLOOD SUGAR,FASTING", source: null }]);
    });

    it("refuses an alias another biomarker already has", async () => {
      // "HS CRP" is a seeded alias of hs-crp.
      const input = await biomarkerInput(db, "glucose", { aliases: [{ alias: "hs crp" }] });
      const e = await editError(saveBiomarker(db, "glucose", input));
      expect(e.fields.aliases).toContain("High-Sensitivity C-Reactive Protein");
    });

    it("converts stored results when the unit changes, from the as-printed values", async () => {
      await applyImport(db, quest);
      const input = await biomarkerInput(db, "testosterone-free", { unit: "ng/dL", rangeLow: "4.6", rangeHigh: "22.4" });
      await saveBiomarker(db, "testosterone-free", input);
      const [t] = await resultsFor(db, "testosterone-free");
      expect(t.result).toMatchObject({ valueNumeric: 4.05, reportedValue: "40.5", reportedUnit: "pg/mL" });
    });

    it("refuses a unit the stored results can't be converted into", async () => {
      await applyImport(db, quest);
      const input = await biomarkerInput(db, "albumin", { unit: "g/L" });
      const e = await editError(saveBiomarker(db, "albumin", input));
      expect(e.fields.unit).toContain("Can't switch");
      const [b] = await db.select().from(biomarkers).where(eq(biomarkers.slug, "albumin"));
      expect(b.unit).toBe("g/dL");
    });
  });

  describe("merging", () => {
    it("moves results and aliases, keeps the old names matching, and deletes the source", async () => {
      // A stand-in duplicate of free testosterone, in different units.
      const dupe = await saveBiomarker(
        db,
        null,
        biomarkerForm.parse({
          name: "Testosterone Free Dupe (FTD)",
          unit: "ng/dL",
          categories: ["male-health"],
          aliases: [{ alias: "FT DUPE", source: "insidetracker" }],
        }),
      );
      await applyImport(db, {
        report: { source: "insidetracker", externalId: "2019-01-01", collectedOn: "2019-01-01" },
        results: [{ name: "FT DUPE", value: "6.1", unit: "ng/dL" }],
      });

      const summary = await mergeBiomarkers(db, dupe, "testosterone-free");
      expect(summary).toEqual({ into: "testosterone-free", moved: 1, dropped: 0 });
      const [t] = await resultsFor(db, "testosterone-free");
      expect(t.result).toMatchObject({ valueNumeric: 61, rawName: "FT DUPE" });
      expect(await db.select().from(biomarkers).where(eq(biomarkers.slug, dupe))).toHaveLength(0);

      // Its alias and its own name now match the target.
      const plan = await planImport(db, {
        report: { source: "insidetracker", externalId: "2019-02-01", collectedOn: "2019-02-01" },
        results: [
          { name: "FT DUPE", value: "6", unit: "ng/dL" },
          { name: "Testosterone Free Dupe", value: "6", unit: "ng/dL" },
        ],
      });
      expect(plan.items.map((i) => ("biomarker" in i ? i.biomarker.slug : i.kind))).toEqual([
        "testosterone-free",
        "testosterone-free",
      ]);
    });

    it("drops a moved result when a higher-ranked source has the target that day", async () => {
      await applyImport(db, quest);
      const dupe = await saveBiomarker(
        db,
        null,
        biomarkerForm.parse({ name: "CRP dupe", unit: "mg/L", categories: ["heart"] }),
      );
      await applyImport(db, {
        report: { source: "insidetracker", externalId: "2020-03-10", collectedOn: "2020-03-10" },
        results: [{ name: "CRP dupe", value: "0.2", unit: "mg/L" }],
      });
      expect(await mergeBiomarkers(db, dupe, "hs-crp")).toMatchObject({ moved: 0, dropped: 1 });
      expect((await resultsFor(db, "hs-crp")).map((r) => r.report.source)).toEqual(["quest"]);
      // The InsideTracker report held only that result, so it's gone too.
      expect((await db.select().from(reports)).map((r) => r.source)).toEqual(["quest"]);
    });

    it("refuses when both have different values in one report, changing nothing", async () => {
      await applyImport(db, quest);
      const dupe = await saveBiomarker(
        db,
        null,
        biomarkerForm.parse({ name: "Albumin dupe", unit: "g/dL", categories: ["liver"] }),
      );
      await applyImport(db, { ...quest, results: [{ name: "Albumin dupe", value: "4.7", unit: "g/dL" }] });
      const e = await editError(mergeBiomarkers(db, dupe, "albumin"));
      expect(e.message).toBe("Quest, Mar 10, 2020: Already stored in this report as 4.6.");
      expect(await resultsFor(db, dupe)).toHaveLength(1);
      expect(await resultsFor(db, "albumin")).toHaveLength(1);
    });

    it("refuses to merge a numeric marker into a qualitative one", async () => {
      const e = await editError(mergeBiomarkers(db, "albumin", "abo-group"));
      expect(e.message).toContain("same kind");
    });
  });

  describe("ordering", () => {
    const categoryOrder = async () =>
      (await db.select({ slug: categories.slug }).from(categories).orderBy(asc(categories.sortOrder))).map((c) => c.slug);
    const biomarkerOrder = async () =>
      (await db.select({ slug: biomarkers.slug }).from(biomarkers).orderBy(asc(biomarkers.sortOrder))).map((b) => b.slug);
    const membersOf = async (category: string) => {
      const members = new Set(
        (
          await db
            .select({ slug: biomarkers.slug })
            .from(biomarkers)
            .innerJoin(biomarkerCategories, eq(biomarkerCategories.biomarkerId, biomarkers.id))
            .innerJoin(categories, eq(biomarkerCategories.categoryId, categories.id))
            .where(eq(categories.slug, category))
        ).map((b) => b.slug),
      );
      return (await biomarkerOrder()).filter((s) => members.has(s));
    };

    it("saves a new category order", async () => {
      const order = (await categoryOrder()).reverse();
      await reorderCategories(db, order);
      expect(await categoryOrder()).toEqual(order);
    });

    it("refuses a category order that's missing one", async () => {
      const order = await categoryOrder();
      expect((await editError(reorderCategories(db, order.slice(1)))).message).toMatch(/changed/);
    });

    it("reorders one category's biomarkers without moving the rest", async () => {
      const before = await biomarkerOrder();
      const thyroid = await membersOf("thyroid");
      const others = before.filter((s) => !thyroid.includes(s));
      await reorderBiomarkers(db, "thyroid", [...thyroid].reverse());
      expect(await membersOf("thyroid")).toEqual([...thyroid].reverse());
      expect((await biomarkerOrder()).filter((s) => !thyroid.includes(s))).toEqual(others);
    });

    it("refuses a biomarker order from another category", async () => {
      expect((await editError(reorderBiomarkers(db, "thyroid", ["hemoglobin"]))).message).toMatch(/changed/);
    });

    it("seeds missing catalog entries after the existing order", async () => {
      await db.delete(biomarkers).where(eq(biomarkers.slug, "tsh"));
      await db.delete(categories).where(eq(categories.slug, "autoimmunity"));
      await seedCatalog(db);
      expect((await categoryOrder()).at(-1)).toBe("autoimmunity");
      expect((await biomarkerOrder()).at(-1)).toBe("tsh");
    });
  });
});

