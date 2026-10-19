import { describe, expect, it } from "vitest";
import { parseRange, parseValue } from "./values";

describe("parseValue", () => {
  it.each([
    ["93", 93, null],
    ["1,802", 1802, null],
    ["<0.2", 0.2, "<"],
    [">24.0", 24, ">"],
    ["> OR = 60", 60, ">="],
    ["< or = 18.4", 18.4, "<="],
    ["≤ 5", 5, "<="],
    ["1.007", 1.007, null],
  ])("reads %s", (raw, value, comparator) => {
    expect(parseValue(raw)).toEqual({ kind: "numeric", value, comparator });
  });

  it("keeps text results as text", () => {
    expect(parseValue("Negative")).toEqual({ kind: "text", text: "Negative" });
    expect(parseValue("SEE NOTE:")).toEqual({ kind: "text", text: "SEE NOTE:" });
  });
});

describe("parseRange", () => {
  it.each([
    ["65-99", 65, 99],
    ["3.8 - 10.8", 3.8, 10.8],
    ["0.60-1.26", 0.6, 1.26],
    ["<200", null, 200],
    ["< 5.0 (calc)", null, 5],
    ["> OR = 40", 40, null],
    ["< or = 18.4", null, 18.4],
    ["< OR = 0.2", null, 0.2],
    [">20.5", 20.5, null],
    ["250-425 (calc)", 250, 425],
    ["1500-7800", 1500, 7800],
  ])("reads %s", (raw, low, high) => {
    expect(parseRange(raw)).toEqual({ low, high });
  });

  it("returns null for anything else", () => {
    expect(parseRange("Optimal <1.0")).toBeNull();
    expect(parseRange("Negative")).toBeNull();
    expect(parseRange("")).toBeNull();
    expect(parseRange(null)).toBeNull();
  });
});
