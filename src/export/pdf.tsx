import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Dashboard } from "@/lib/data";
import { formatDate, formatMonth, formatValue } from "@/lib/format";
import type { Status } from "@/lib/status";
import type { MarkerSummary, Point } from "@/lib/types";
import { exportSections, markerRange } from "./sections";

// A printable grid for a doctor: one row per biomarker, one column per month with results, grouped
// by category. The full history, to the day, is in the CSV.
export async function resultsPdf(data: Dashboard, { generatedOn }: { generatedOn: string }) {
  return renderToBuffer(<ResultsDocument data={data} generatedOn={generatedOn} />);
}

// Wrap long names between words; react-pdf otherwise hyphenates ("Concentra-tion").
Font.registerHyphenationCallback((word) => [word]);

// The most recent months that fit across a portrait page; older ones are left to the CSV.
const MAX_MONTHS = 8;

// react-pdf can't read the app's oklch tokens; these are the light theme's status colors from
// src/app/globals.css, converted to hex.
const STATUS_HEX: Record<Status, string> = {
  below: "#dc5426",
  above: "#dc5426",
  abnormal: "#dc5426",
  in_range: "#3b9555",
  normal: "#3b9555",
  optimal: "#007e57",
  other: "#868686",
};

const LEGEND: { label: string; status: Status }[] = [
  { label: "In range", status: "in_range" },
  { label: "Optimal", status: "optimal" },
  { label: "Out of range", status: "above" },
  { label: "No range", status: "other" },
];

const MUTED = "#6b6b6b";
const RULE = "#e2e2e2";
const NAME_WIDTH = 150; // points; the month columns share the rest of the row.

const s = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 36, fontSize: 7.5, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  subtitle: { marginTop: 3, color: MUTED, flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  category: { marginTop: 12, marginBottom: 2, fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: RULE, paddingVertical: 2.5 },
  head: { color: MUTED, fontSize: 6.5 },
  name: { width: NAME_WIDTH, paddingRight: 6 },
  month: { flex: 1, flexDirection: "row", alignItems: "center", paddingRight: 3 },
  footnote: { color: MUTED, fontSize: 6, marginTop: 0.5 },
  dot: { width: 4, height: 4, borderRadius: 2, marginRight: 3 },
  legend: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 6.5, color: MUTED },
});

function ResultsDocument({ data, generatedOn }: { data: Dashboard; generatedOn: string }) {
  const sections = exportSections(data);

  // Columns are months ("2025-08"), oldest to newest, so each row reads as a trend.
  const allMonths = [...new Set(data.markers.flatMap((m) => m.points.map((p) => p.date.slice(0, 7))))].sort();
  const months = allMonths.slice(-MAX_MONTHS);
  const dropped = allMonths.length - months.length;

  return (
    <Document title="Lab results" creator="Biomarker Tracker">
      <Page size="LETTER" style={s.page}>
        <Text style={s.title}>Lab results</Text>
        <View style={s.subtitle}>
          <Text>
            {data.markers.length} biomarkers · generated {formatDate(generatedOn)}
            {dropped > 0 && ` · ${dropped} earlier ${dropped === 1 ? "month" : "months"} in the CSV`}
          </Text>
          {LEGEND.map((l) => (
            <View key={l.label} style={s.legend}>
              <View style={[s.dot, { backgroundColor: STATUS_HEX[l.status] }]} />
              <Text>{l.label}</Text>
            </View>
          ))}
        </View>
        {sections.map((c) => (
          <View key={c.name}>
            {/* Keep each category's heading with its column labels and first row. */}
            <Text style={s.category} minPresenceAhead={40}>
              {c.name}
            </Text>
            <View style={[s.row, s.head]} wrap={false}>
              <Text style={s.name}>Biomarker</Text>
              {months.map((month) => (
                <Text key={month} style={s.month}>
                  {formatMonth(`${month}-01`)}
                </Text>
              ))}
            </View>
            {c.markers.map((m) => (
              <MarkerRow key={m.slug} marker={m} months={months} />
            ))}
          </View>
        ))}
        <View style={s.footer} fixed>
          <Text>Lab results · {formatDate(generatedOn)} · ranges are this tracker&apos;s, not necessarily the lab&apos;s</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function MarkerRow({ marker: m, months }: { marker: MarkerSummary; months: string[] }) {
  // Two results in one month share a column; the later one is shown. Points are oldest first.
  const byMonth = new Map(m.points.map((p) => [p.date.slice(0, 7), p]));
  const range = markerRange(m);
  const footnote = [m.unit, range && `range ${range}`].filter(Boolean).join(" · ");
  return (
    <View style={s.row} wrap={false}>
      <View style={s.name}>
        <Text>{pdfText(m.name)}</Text>
        {footnote && <Text style={s.footnote}>{pdfText(footnote)}</Text>}
      </View>
      {months.map((month) => {
        const p = byMonth.get(month);
        return (
          <View key={month} style={s.month}>
            {p && <Cell point={p} />}
          </View>
        );
      })}
    </View>
  );
}

function Cell({ point: p }: { point: Point }) {
  return (
    <>
      <View style={[s.dot, { backgroundColor: STATUS_HEX[p.status] }]} />
      <Text>{pdfText(formatValue(p, { ascii: true }))}</Text>
    </>
  );
}

// The built-in Helvetica covers Latin-1 (so "µ" and "–" are fine) but not "≤" or "≥", which would
// print as blanks.
function pdfText(text: string) {
  return text.replaceAll("≤", "<=").replaceAll("≥", ">=");
}
