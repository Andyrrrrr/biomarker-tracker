import { describe, expect, it } from "vitest";
import { getStatus, statusGroup, type RangeSpec } from "./status";

const range = (low: number | null, high: number | null, extra: Partial<RangeSpec> = {}): RangeSpec => ({
  resultType: "numeric",
  rangeLow: low,
  rangeHigh: high,
  optimalEnabled: false,
  optimalLow: null,
  optimalHigh: null,
  normalValues: null,
  ...extra,
});
const num = (valueNumeric: number, comparator: "<" | "<=" | ">" | ">=" | null = null) => ({
  valueNumeric,
  comparator,
  valueText: null,
});

describe("getStatus", () => {
  it("compares against both ends", () => {
    expect(getStatus(range(38.5, 50), num(47.7))).toBe("in_range");
    expect(getStatus(range(38.5, 50), num(51))).toBe("above");
    expect(getStatus(range(38.5, 50), num(30))).toBe("below");
    expect(getStatus(range(38.5, 50), num(50))).toBe("in_range");
  });

  it("handles one-sided ranges", () => {
    expect(getStatus(range(null, 200), num(160))).toBe("in_range");
    expect(getStatus(range(40, null), num(39))).toBe("below");
  });

  it("is Other without a range or a number", () => {
    expect(getStatus(range(null, null), num(54.4))).toBe("other");
    expect(getStatus(range(0, 3), { valueNumeric: null, comparator: null, valueText: "SEE NOTE" })).toBe("other");
  });

  it("reads below/above-the-limit values", () => {
    expect(getStatus(range(null, 1), num(0.2, "<"))).toBe("in_range");
    expect(getStatus(range(0.5, 3), num(0.2, "<"))).toBe("below");
    expect(getStatus(range(0.2, 3), num(0.2, "<"))).toBe("below");
    expect(getStatus(range(0.2, 3), num(0.2, "<="))).toBe("in_range");
    expect(getStatus(range(5.4, null), num(24, ">"))).toBe("in_range");
    expect(getStatus(range(null, 24), num(24, ">"))).toBe("above");
  });

  it("reports Optimal only when the band is on", () => {
    const vitD = range(30, 100, { optimalLow: 50, optimalHigh: 80 });
    expect(getStatus(vitD, num(60))).toBe("in_range");
    expect(getStatus({ ...vitD, optimalEnabled: true }, num(60))).toBe("optimal");
    expect(getStatus({ ...vitD, optimalEnabled: true }, num(35))).toBe("in_range");
    expect(getStatus({ ...vitD, optimalEnabled: true }, num(120))).toBe("above");
  });

  it("matches qualitative values case-insensitively", () => {
    const ana = range(null, null, { resultType: "qualitative", normalValues: ["Negative"] });
    expect(getStatus(ana, { valueNumeric: null, comparator: null, valueText: "NEGATIVE" })).toBe("normal");
    expect(getStatus(ana, { valueNumeric: null, comparator: null, valueText: "Positive" })).toBe("abnormal");
    const abo = range(null, null, { resultType: "qualitative" });
    expect(getStatus(abo, { valueNumeric: null, comparator: null, valueText: "O" })).toBe("other");
  });
});

describe("statusGroup", () => {
  it("groups statuses for the filter chips", () => {
    expect(statusGroup("above")).toBe("out_of_range");
    expect(statusGroup("abnormal")).toBe("out_of_range");
    expect(statusGroup("optimal")).toBe("in_range");
    expect(statusGroup("normal")).toBe("in_range");
    expect(statusGroup("other")).toBe("other");
  });
});
