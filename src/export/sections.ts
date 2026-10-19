import type { Dashboard } from "@/lib/data";
import { formatRange } from "@/lib/status";
import type { MarkerSummary } from "@/lib/types";

// The dashboard's categories with each biomarker kept only under its first one, so an export
// lists it once.
export function exportSections(data: Dashboard): { name: string; markers: MarkerSummary[] }[] {
  const listed = new Set<string>();
  const sections: { name: string; markers: MarkerSummary[] }[] = [];
  for (const c of data.categories) {
    const markers = c.markers.filter((m) => !listed.has(m.slug));
    for (const m of markers) listed.add(m.slug);
    if (markers.length) sections.push({ name: c.name, markers });
  }
  return sections;
}

// "13.2–17.1", "> 40", or a qualitative marker's normal values.
export function markerRange(m: MarkerSummary): string | null {
  return m.resultType === "qualitative" ? (m.normalValues?.join(", ") ?? null) : formatRange(m.rangeLow, m.rangeHigh);
}
