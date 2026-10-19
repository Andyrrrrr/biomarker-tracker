import { describe, expect, it } from "vitest";
import { convertValue, sameUnit } from "./units";

describe("units", () => {
  it("treats spellings of one unit as the same", () => {
    expect(sameUnit("µg/dL", "mcg/dL")).toBe(true);
    expect(sameUnit("x10E6/µL", "Million/uL")).toBe(true);
    expect(sameUnit("thousands/uL", "Thousand/uL")).toBe(true);
    expect(sameUnit("µIU/mL", "uIU/mL")).toBe(true);
    expect(sameUnit("% of total Hgb", "%")).toBe(true);
    expect(sameUnit("g/dL (calc)", "g/dL")).toBe(true);
    expect(sameUnit(null, "")).toBe(true);
    expect(sameUnit("mg/dL", "g/dL")).toBe(false);
  });

  it("converts free testosterone between ng/dL and pg/mL", () => {
    expect(convertValue(4.2, "ng/dL", "pg/mL")).toBe(42);
    expect(convertValue(42.1, "pg/mL", "ng/dL")).toBe(4.21);
  });

  it("fixes InsideTracker's TSH label only for TSH", () => {
    expect(convertValue(2.96, "µIU/L", "mIU/L", "tsh")).toBe(2.96);
    expect(convertValue(2.96, "µIU/L", "mIU/L", "insulin")).toBeNull();
  });

  it("refuses unknown conversions", () => {
    expect(convertValue(5, "mmol/L", "mg/dL")).toBeNull();
    expect(convertValue(5, "%", null)).toBeNull();
  });
});
