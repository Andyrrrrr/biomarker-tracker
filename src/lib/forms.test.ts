import { describe, expect, it } from "vitest";
import { biomarkerForm, fieldErrors, manualReportForm, readForm, slugify, uniqueSlug } from "./forms";

const form = (entries: [string, string][]) => {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
};

describe("readForm", () => {
  it("nests dotted rows, closes gaps from removed rows and collects lists", () => {
    expect(
      readForm(
        form([
          ["$ACTION_ID_abc", ""],
          ["collectedOn", "2024-01-02"],
          ["results.0.value", "1"],
          ["results.3.value", "2"],
          ["results.3.unit", "mg/dL"],
          ["categories[]", "heart"],
          ["categories[]", "liver"],
        ]),
      ),
    ).toEqual({
      collectedOn: "2024-01-02",
      results: [{ value: "1" }, { value: "2", unit: "mg/dL" }],
      categories: ["heart", "liver"],
    });
  });

  it("ignores field names that would reach Object.prototype", () => {
    const read = readForm(
      form([
        ["__proto__.polluted", "yes"],
        ["constructor.prototype.polluted", "yes"],
        ["results.0.__proto__", "yes"],
        ["name", "Glucose"],
      ]),
    );
    expect(read).toEqual({ name: "Glucose" });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("biomarkerForm", () => {
  const base = { name: "Glucose", categories: ["metabolic"] };

  it("turns blanks into null and numbers into numbers", () => {
    const v = biomarkerForm.parse({ ...base, unit: " mg/dL ", rangeLow: "65", rangeHigh: "1,000", shortName: "" });
    expect(v).toMatchObject({ unit: "mg/dL", rangeLow: 65, rangeHigh: 1000, shortName: null, optimalEnabled: false });
  });

  it("drops fields that don't apply to the marker's kind", () => {
    const v = biomarkerForm.parse({ ...base, resultType: "qualitative", unit: "mg/dL", normalValues: "Negative\nNone seen, Negative" });
    expect(v).toMatchObject({ unit: null, normalValues: ["Negative", "None seen"] });
    expect(biomarkerForm.parse({ ...base, normalValues: "Negative" }).normalValues).toBeNull();
  });

  it("keys messages by field", () => {
    const r = biomarkerForm.safeParse({ name: " ", rangeLow: "abc", categories: [] });
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!)).toMatchObject({ name: "Enter a name", rangeLow: "Enter a number" });

    const ranges = biomarkerForm.safeParse({ ...base, rangeLow: "10", rangeHigh: "5", optimalEnabled: "on" });
    expect(fieldErrors(ranges.error!)).toEqual({ rangeHigh: "Must be at least the low end", optimalLow: "Set at least one end" });

    expect(fieldErrors(biomarkerForm.safeParse({ name: "X" }).error!)).toEqual({ categories: "Pick at least one category" });
  });

  it("keeps alias rows that have a name, with their source", () => {
    const v = biomarkerForm.parse({ ...base, aliases: [{ alias: "GLU", source: "quest" }, { alias: "", source: "" }, { alias: "Sugar", source: "" }] });
    expect(v.aliases).toEqual([
      { alias: "GLU", source: "quest" },
      { alias: "Sugar", source: null },
    ]);
  });
});

describe("manualReportForm", () => {
  it("needs a date and at least one complete row", () => {
    const r = manualReportForm.safeParse({ collectedOn: "", results: [{ biomarker: "", value: "" }] });
    expect(fieldErrors(r.error!)).toEqual({
      collectedOn: "Enter a date",
      "results.0.value": "Enter a value",
      "results.0.biomarker": "Pick a biomarker",
    });
    expect(fieldErrors(manualReportForm.safeParse({ collectedOn: "2024-01-01" }).error!)).toEqual({
      results: "Add at least one result",
    });
  });

  it("reads fasting as yes, no or not recorded", () => {
    const row = { biomarker: "glucose", value: "90" };
    const parse = (fasting: string) => manualReportForm.parse({ collectedOn: "2024-01-01", fasting, results: [row] }).fasting;
    expect([parse("yes"), parse("no"), parse("")]).toEqual([true, false, null]);
  });
});

describe("slugs", () => {
  it("slugifies names and finds the first free suffix", () => {
    expect(slugify("Vitamin B12 (Cobalamin)")).toBe("vitamin-b12-cobalamin");
    expect(slugify("Ápolipoprotein B")).toBe("apolipoprotein-b");
    expect(uniqueSlug("glucose", ["glucose", "glucose-2"])).toBe("glucose-3");
    expect(uniqueSlug("glucose", [])).toBe("glucose");
  });
});
