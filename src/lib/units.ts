// Unit handling for ingest: spellings that mean the same unit, and the few real conversions our
// sources need. A unit pair that isn't listed here is a problem the ingest plan reports; it never
// guesses.

// First entry is the display spelling.
const SAME_UNIT: string[][] = [
  ["mcg/dL", "µg/dL", "ug/dL"],
  // 1 µIU/mL is exactly 1 mIU/L.
  ["uIU/mL", "µIU/mL", "mIU/L"],
  ["Thousand/uL", "thousands/uL", "x10E3/uL", "x10E3/µL", "K/uL"],
  ["Million/uL", "millions/uL", "x10E6/uL", "x10E6/µL", "M/uL"],
  ["cells/uL", "cells/µL"],
  ["umol/L", "µmol/L"],
  ["%", "% of total Hgb"],
  ["mL/min/1.73m2", "mL/min/1.73 m2"],
];

// value in `from` × factor = value in `to`. Inverses are derived.
const FACTORS: [from: string, to: string, factor: number][] = [
  ["pg/mL", "ng/dL", 0.1],
  ["ng/mL", "ng/dL", 100],
  ["mg/L", "mg/dL", 0.1],
];

// Units a source prints wrongly for one biomarker, keyed by biomarker slug. InsideTracker labels
// TSH "µIU/L" though its values match Quest's mIU/L exactly.
const MISLABELED: Record<string, Record<string, string>> = {
  tsh: { "µIU/L": "mIU/L", "uIU/L": "mIU/L" },
};

function key(unit: string | null | undefined): string {
  if (!unit) return "";
  const trimmed = unit.trim().replace(/\s*\(calc\)$/i, "");
  const group = SAME_UNIT.find((g) => g.some((u) => u.toLowerCase() === trimmed.toLowerCase()));
  return (group ? group[0] : trimmed).toLowerCase();
}

export function sameUnit(a: string | null | undefined, b: string | null | undefined): boolean {
  return key(a) === key(b);
}

// Converts `value` from the reported unit to the biomarker's unit. Returns null when there's no
// known conversion.
export function convertValue(
  value: number,
  from: string | null | undefined,
  to: string | null | undefined,
  biomarkerSlug?: string,
): number | null {
  const fixed = (from && biomarkerSlug && MISLABELED[biomarkerSlug]?.[from.trim()]) || from;
  if (sameUnit(fixed, to)) return value;
  for (const [f, t, factor] of FACTORS) {
    if (sameUnit(fixed, f) && sameUnit(to, t)) return tidy(value * factor);
    if (sameUnit(fixed, t) && sameUnit(to, f)) return tidy(value / factor);
  }
  return null;
}

// Strips float noise (4.2 / 0.1 = 42.00000000000001).
function tidy(n: number): number {
  return Number(n.toPrecision(12));
}
