import { describe, expect, it } from "vitest";
import type { MarkerSummary, Point } from "@/lib/types";
import { resultsCsv } from "./csv";

function point(over: Partial<Point>): Point {
  return {
    id: 1,
    reportId: 1,
    date: "2024-01-05",
    valueNumeric: null,
    comparator: null,
    valueText: null,
    reportedValue: "",
    reportedUnit: null,
    labRangeText: null,
    labFlag: null,
    isCalculated: false,
    notes: null,
    source: "quest",
    lab: null,
    status: "other",
    ...over,
  };
}

function marker(over: Partial<MarkerSummary> & { points: Point[] }): MarkerSummary {
  return {
    slug: "x",
    name: "X",
    shortName: null,
    description: null,
    unit: null,
    resultType: "numeric",
    rangeLow: null,
    rangeHigh: null,
    optimalEnabled: false,
    optimalLow: null,
    optimalHigh: null,
    normalValues: null,
    categories: [],
    latest: over.points[over.points.length - 1],
    status: "other",
    group: "other",
    ...over,
  };
}

const ldl = marker({
  slug: "ldl",
  name: "LDL Cholesterol",
  unit: "mg/dL",
  rangeHigh: 100,
  points: [
    point({ date: "2023-01-10", valueNumeric: 2.8, status: "in_range" }),
    point({ date: "2024-06-01", valueNumeric: 92, status: "in_range" }),
  ],
});
const crp = marker({
  slug: "crp",
  name: "hs-CRP, cardiac",
  unit: "mg/L",
  rangeHigh: 1,
  points: [point({ date: "2024-06-01", valueNumeric: 0.2, comparator: "<=" })],
});
const urine = marker({
  slug: "urine-protein",
  name: "Urine Protein",
  resultType: "qualitative",
  normalValues: ["Negative", "None"],
  points: [point({ date: "2022-03-01", valueText: "Trace", status: "abnormal" })],
});

const data = { markers: [ldl, urine, crp], categories: [] };

describe("resultsCsv", () => {
  const lines = resultsCsv(data).split("\r\n");

  it("has the details first, then every date oldest to newest", () => {
    expect(lines[0]).toBe("Biomarker,Unit,Range,2022-03-01,2023-01-10,2024-06-01");
    expect(lines.at(-1)).toBe("");
  });

  it("lists each biomarker once, alphabetically, with its values by date", () => {
    expect(lines.slice(1, -1)).toEqual([
      '"hs-CRP, cardiac",mg/L,< 1,,,<=0.2',
      "LDL Cholesterol,mg/dL,< 100,,2.8,92",
      'Urine Protein,,"Negative, None",Trace,,',
    ]);
  });

  it("keeps cells from running as spreadsheet formulas, but leaves negative numbers alone", () => {
    const sneaky = marker({
      name: "=HYPERLINK(\"https://example.com\")",
      resultType: "qualitative",
      points: [
        point({ date: "2024-01-01", valueText: "@SUM(A1)" }),
        point({ date: "2024-02-01", valueText: "+1+1" }),
        point({ date: "2024-03-01", valueText: "-2" }),
      ],
    });
    const [, row] = resultsCsv({ markers: [sneaky], categories: [] }).split("\r\n");
    expect(row).toBe(`"'=HYPERLINK(""https://example.com"")",,,'@SUM(A1),'+1+1,-2`);
  });
});
