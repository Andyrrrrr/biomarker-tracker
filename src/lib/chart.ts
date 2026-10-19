import { STATUS_LABEL } from "@/lib/status";

// Range scale and bands shared by the detail chart (marker-chart.tsx) and the list sparkline
// (sparkline.tsx), so both draw results on the same scale against the same range.

export type Band = {
  status: "above" | "in_range" | "below";
  y1: number; // bottom
  y2: number; // top
  title: string;
  range: string; // e.g. "4–10", "≥ 4", "< 4"
};

const PAD = 0.25; // headroom above and below, as a share of the span

// The y-axis spans the values plus both range ends, padded on each side, so the bands always
// show. It stops at 0 when nothing is negative.
export function rangeDomain(values: number[], low: number | null, high: number | null): [number, number] {
  const ys = [...values, ...(low !== null ? [low] : []), ...(high !== null ? [high] : [])];
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const span = hi - lo || Math.abs(ys[0]) || 1;
  return [Math.max(lo - span * PAD, lo >= 0 ? 0 : -Infinity), hi + span * PAD];
}

// Above / in / below range bands filling [yMin, yMax], top to bottom. None without a range.
export function rangeBands(low: number | null, high: number | null, [yMin, yMax]: [number, number]): Band[] {
  const bands: Band[] = [];
  if (high !== null) {
    bands.push({ status: "above", y1: high, y2: yMax, title: STATUS_LABEL.above, range: `> ${high}` });
  }
  if (low !== null || high !== null) {
    bands.push({
      status: "in_range",
      y1: low ?? yMin,
      y2: high ?? yMax,
      title: STATUS_LABEL.in_range,
      range: low !== null && high !== null ? `${low}–${high}` : low !== null ? `≥ ${low}` : `≤ ${high}`,
    });
  }
  if (low !== null) {
    bands.push({ status: "below", y1: yMin, y2: low, title: STATUS_LABEL.below, range: `< ${low}` });
  }
  return bands;
}
