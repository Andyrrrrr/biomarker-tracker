import type { Dashboard } from "@/lib/data";
import { formatValue } from "@/lib/format";
import { markerRange } from "./sections";

// A spreadsheet grid like the PDF's: one row per biomarker, alphabetically, with its details first
// and then one column per collection date, oldest to newest. Values are in the biomarker's unit.
export function resultsCsv(data: Dashboard): string {
  const markers = [...data.markers].sort((a, b) => a.name.localeCompare(b.name));
  const dates = [...new Set(data.markers.flatMap((m) => m.points.map((p) => p.date)))].sort();

  const lines = [
    ["Biomarker", "Unit", "Range", ...dates],
    ...markers.map((m) => {
      // Points are oldest first, so a second result on the same day (rare) keeps the later one.
      const byDate = new Map(m.points.map((p) => [p.date, formatValue(p, { ascii: true })]));
      return [m.name, m.unit ?? "", markerRange(m) ?? "", ...dates.map((d) => byDate.get(d) ?? "")];
    }),
  ];
  // CRLF and quoting per RFC 4180, which is what Excel and Numbers expect.
  return lines.map((cells) => cells.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function csvCell(value: string): string {
  const safe = noFormula(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

// Excel and Sheets run a cell that starts with = + - @ (or a tab or CR) as a formula. Values come
// from lab reports and typed names, so any such cell that isn't a plain number gets a leading ',
// OWASP's advice for CSV injection.
function noFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) && !/^[+-]?\d+(\.\d+)?$/.test(value) ? `'${value}` : value;
}
