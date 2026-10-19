import { STATUS_COLOR } from "@/components/status";
import { rangeBands, rangeDomain } from "@/lib/chart";
import type { MarkerSummary } from "@/lib/types";

// A small trend chart for list rows: every result, evenly spaced (not to scale in time, so a
// single old result doesn't squash the rest), on a rounded backer tinted with the same
// above / in / below range bands as the detail chart. The y-axis is the detail chart's
// (rangeDomain: the values plus the range limits), so a change looks as big here as it does
// there; fitting the values alone made a 0.3 → 0.2 step read as a cliff.

// Look. Tune here.
const WIDTH = 112;
const HEIGHT = 46; // the row's two text lines: 16px name (24 line) + 2 gap + 14px detail (20 line)
const RADIUS = 6; // backer corner radius
const PAD_X = 10; // space between the backer's sides and the first and last dots
const BACKER_OPACITY = 0.35; // neutral backer (--muted) under the bands
const IN_BAND_OPACITY = 0.09;
const OUT_BAND_OPACITY = 0.07;
const BAND_GAP = 1.5; // px of plain backer between neighboring bands
const MIN_BAND = 3; // px; a band thinner than this at the top or bottom is dropped
const LINE_DASH = "2 3"; // with round caps, so dashes read as soft dots
const LINE_OPACITY = 0.55;
const DOT_R = 1.75;
const LAST_DOT_R = 2.75;

export function Sparkline({ marker }: { marker: MarkerSummary }) {
  if (marker.resultType === "qualitative") return <QualitativeDots marker={marker} />;

  const points = marker.points.filter((p) => p.valueNumeric !== null);
  if (!points.length) return null;

  const domain = rangeDomain(points.map((p) => p.valueNumeric!), marker.rangeLow, marker.rangeHigh);
  const [min, max] = domain;
  const x = (i: number) =>
    points.length === 1 ? WIDTH - PAD_X : PAD_X + (i / (points.length - 1)) * (WIDTH - PAD_X * 2);
  const y = (v: number) => (1 - (v - min) / (max - min)) * HEIGHT;
  // A band edge in value terms, clamped to the window, and pushed to the window's edge when it
  // would leave a sliver of a band there.
  const edge = (v: number) => {
    const c = Math.min(max, Math.max(min, v));
    return y(c) < MIN_BAND ? max : y(c) > HEIGHT - MIN_BAND ? min : c;
  };
  const last = points.length - 1;
  const clipId = `spark-${marker.slug}`;

  return (
    <Backer clipId={clipId}>
      <g clipPath={`url(#${clipId})`}>
        {rangeBands(marker.rangeLow, marker.rangeHigh, domain).map((b) => {
          // Edges inside the window (a limit) give up half the gap on each side.
          const [y2, y1] = [edge(b.y2), edge(b.y1)];
          const top = y(y2) + (y2 < max ? BAND_GAP / 2 : 0);
          const bottom = y(y1) - (y1 > min ? BAND_GAP / 2 : 0);
          if (bottom <= top) return null;
          return (
            <rect
              key={b.status}
              x={0}
              y={top}
              width={WIDTH}
              height={bottom - top}
              fill={STATUS_COLOR[b.status]}
              opacity={b.status === "in_range" ? IN_BAND_OPACITY : OUT_BAND_OPACITY}
            />
          );
        })}
      </g>
      {points.length > 1 && (
        <polyline
          points={points.map((p, i) => `${x(i)},${y(p.valueNumeric!)}`).join(" ")}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1}
          strokeDasharray={LINE_DASH}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={LINE_OPACITY}
        />
      )}
      {points.map((p, i) => (
        <circle
          key={p.id}
          cx={x(i)}
          cy={y(p.valueNumeric!)}
          r={i === last ? LAST_DOT_R : DOT_R}
          fill={STATUS_COLOR[p.status]}
        />
      ))}
    </Backer>
  );
}

function QualitativeDots({ marker }: { marker: MarkerSummary }) {
  const points = marker.points.slice(-8);
  return (
    <Backer>
      {points.map((p, i) => (
        <circle
          key={p.id}
          cx={WIDTH - PAD_X - (points.length - 1 - i) * 12}
          cy={HEIGHT / 2}
          r={i === points.length - 1 ? LAST_DOT_R : DOT_R + 0.5}
          fill={STATUS_COLOR[p.status]}
        />
      ))}
    </Backer>
  );
}

// The rounded neutral box every sparkline sits on; clipId names its shape for clipping bands. A
// biomarker in two categories repeats its id, which is harmless: every clip shape is identical.
function Backer({ clipId, children }: { clipId?: string; children: React.ReactNode }) {
  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="shrink-0 overflow-visible" aria-hidden>
      {clipId && (
        <clipPath id={clipId}>
          <rect width={WIDTH} height={HEIGHT} rx={RADIUS} />
        </clipPath>
      )}
      <rect width={WIDTH} height={HEIGHT} rx={RADIUS} fill="var(--muted)" opacity={BACKER_OPACITY} />
      {children}
    </svg>
  );
}
