import type { Biomarker, Comparator } from "@/db/schema";

export type Status = "below" | "in_range" | "optimal" | "above" | "other" | "normal" | "abnormal";
export type StatusGroup = "out_of_range" | "in_range" | "other";

export type RangeSpec = Pick<
  Biomarker,
  "resultType" | "rangeLow" | "rangeHigh" | "optimalEnabled" | "optimalLow" | "optimalHigh" | "normalValues"
>;

export type ResultValue = {
  valueNumeric: number | null;
  comparator: Comparator | null;
  valueText: string | null;
};

// Status always comes from the biomarker's own (editable) range, not the range a lab printed, so
// one marker reads the same across every lab and year.
export function getStatus(b: RangeSpec, r: ResultValue): Status {
  if (b.resultType === "qualitative") {
    if (!b.normalValues?.length || !r.valueText) return "other";
    const value = r.valueText.trim().toLowerCase();
    return b.normalValues.some((n) => n.toLowerCase() === value) ? "normal" : "abnormal";
  }

  const { rangeLow: low, rangeHigh: high } = b;
  const x = r.valueNumeric;
  if (x === null || (low === null && high === null)) return "other";

  // "<0.2" means somewhere under 0.2. Only call it below when the whole span is below.
  if (r.comparator === "<" || r.comparator === "<=") {
    if (low !== null && (r.comparator === "<" ? x <= low : x < low)) return "below";
    if (high !== null && x > high) return "above";
    return inBand(b, x);
  }
  if (r.comparator === ">" || r.comparator === ">=") {
    if (high !== null && (r.comparator === ">" ? x >= high : x > high)) return "above";
    if (low !== null && x < low) return "below";
    return inBand(b, x);
  }

  if (low !== null && x < low) return "below";
  if (high !== null && x > high) return "above";
  return inBand(b, x);
}

function inBand(b: RangeSpec, x: number): Status {
  if (!b.optimalEnabled || (b.optimalLow === null && b.optimalHigh === null)) return "in_range";
  const aboveLow = b.optimalLow === null || x >= b.optimalLow;
  const belowHigh = b.optimalHigh === null || x <= b.optimalHigh;
  return aboveLow && belowHigh ? "optimal" : "in_range";
}

export function statusGroup(status: Status): StatusGroup {
  if (status === "below" || status === "above" || status === "abnormal") return "out_of_range";
  if (status === "other") return "other";
  return "in_range";
}

export const STATUS_LABEL: Record<Status, string> = {
  below: "Below range",
  in_range: "In range",
  optimal: "Optimal",
  above: "Above range",
  other: "",
  normal: "In range",
  abnormal: "Out of range",
};

// For range text like "39.4–51.1", "< 200", "≥ 40".
export function formatRange(low: number | null, high: number | null): string | null {
  if (low !== null && high !== null) return `${low}–${high}`;
  if (high !== null) return `< ${high}`;
  if (low !== null) return `> ${low}`;
  return null;
}
