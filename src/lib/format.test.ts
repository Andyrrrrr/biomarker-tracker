import { describe, expect, it } from "vitest";
import { formatMonth, formatMonthYear } from "./format";

describe("month formats", () => {
  it("writes the short and full year", () => {
    expect(formatMonth("2025-08-29")).toBe("Aug '25");
    expect(formatMonthYear("2025-08-29")).toBe("Aug 2025");
  });

  it("keeps the first of the month in its own month whatever the local time zone", () => {
    expect(formatMonthYear("2026-01-01")).toBe("Jan 2026");
  });
});
