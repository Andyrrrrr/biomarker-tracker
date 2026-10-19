import { describe, expect, it } from "vitest";
import { rangeBands, rangeDomain } from "./chart";

describe("rangeDomain", () => {
  it("spans the values and both range ends, padded", () => {
    // 10..50 → span 40, pad 0.25 → 0..60
    expect(rangeDomain([20, 30], 10, 50)).toEqual([0, 60]);
  });

  it("stops at 0 when nothing is negative", () => {
    expect(rangeDomain([1, 2], 1, 10)[0]).toBe(0);
  });

  it("can go below 0 when a value is negative", () => {
    expect(rangeDomain([-2, 2], null, null)).toEqual([-3, 3]);
  });

  it("keeps a small change small against a distant limit", () => {
    // 0.3 → 0.2 under a limit of 1: the step is 8% of the height, not the full box.
    expect(rangeDomain([0.3, 0.2], null, 1)).toEqual([0, 1.2]);
  });

  it("gives a single value some height", () => {
    const [lo, hi] = rangeDomain([5], null, null);
    expect(lo).toBeLessThan(5);
    expect(hi).toBeGreaterThan(5);
  });
});

describe("rangeBands", () => {
  it("fills the domain above, in and below a two-sided range", () => {
    expect(rangeBands(4, 10, [0, 14]).map((b) => [b.status, b.y1, b.y2, b.range])).toEqual([
      ["above", 10, 14, "> 10"],
      ["in_range", 4, 10, "4–10"],
      ["below", 0, 4, "< 4"],
    ]);
  });

  it("has no below band for an upper-only range", () => {
    expect(rangeBands(null, 100, [0, 150]).map((b) => [b.status, b.y1, b.y2, b.range])).toEqual([
      ["above", 100, 150, "> 100"],
      ["in_range", 0, 100, "≤ 100"],
    ]);
  });

  it("has no bands without a range", () => {
    expect(rangeBands(null, null, [0, 1])).toEqual([]);
  });
});
