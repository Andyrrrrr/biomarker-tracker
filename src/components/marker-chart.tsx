"use client";

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceArea,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STATUS_COLOR } from "@/components/status";
import { ChartContainer } from "@/components/ui/chart";
import { rangeBands, rangeDomain } from "@/lib/chart";
import { formatDate, formatValue } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/sources";
import { STATUS_LABEL } from "@/lib/status";
import type { MarkerSummary, Point } from "@/lib/types";

// Chart layout. The left share of the x-axis is left empty so the band labels sit beside the
// first result instead of under it, as on Function's detail view.
const HEIGHT = 280;
const LABEL_GUTTER = 0.28; // share of the time span added before the first result
const RIGHT_PAD = 0.04; // share added after the last
const SINGLE_POINT_SPAN = 365 * 24 * 3600 * 1000; // a year, when there's only one result
const LABEL_MIN_GAP = 0.05; // hide a value label closer than this share of the span to the next
const LINE_OPACITY = 0.45; // the line between results stays quieter than the dots
const LINE_DASH = "3 5"; // with round caps

type Datum = { t: number; value: number; label: string; point: Point };

export function MarkerChart({ marker }: { marker: MarkerSummary }) {
  const data: Datum[] = marker.points
    .filter((p) => p.valueNumeric !== null)
    .map((p) => ({
      t: Date.parse(`${p.date}T00:00:00Z`),
      value: p.valueNumeric!,
      label: formatValue(p),
      point: p,
    }));
  if (!data.length) return null;

  const { rangeLow: low, rangeHigh: high } = marker;
  const [yMin, yMax] = rangeDomain(data.map((d) => d.value), low, high);

  const first = data[0].t;
  const last = data[data.length - 1].t;
  const tSpan = last - first || SINGLE_POINT_SPAN;
  const xDomain = [first - tSpan * LABEL_GUTTER, last + tSpan * RIGHT_PAD];

  // Labels on draws close together would overlap; keep the later one (the tooltip has the rest).
  data.forEach((d, i) => {
    const next = data[i + 1];
    if (next && (next.t - d.t) / tSpan < LABEL_MIN_GAP) d.label = "";
  });

  const bands = rangeBands(low, high, [yMin, yMax]).map((b) => ({ ...b, color: STATUS_COLOR[b.status] }));

  return (
    <ChartContainer
      config={{ value: { label: marker.name } }}
      className="aspect-auto w-full"
      style={{ height: HEIGHT }}
    >
      <LineChart data={data} margin={{ top: 24, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="2 4" />
        {bands.map((b) => (
          <ReferenceArea
            key={b.title}
            y1={b.y1}
            y2={b.y2}
            x1={xDomain[0]}
            x2={xDomain[1]}
            fill={b.color}
            fillOpacity={0.06}
            ifOverflow="hidden"
            label={(props: { viewBox?: { x: number; y: number; height: number } }) => (
              <BandLabel viewBox={props.viewBox} title={b.title} range={b.range} color={b.color} />
            )}
          />
        ))}
        {marker.optimalEnabled && (marker.optimalLow !== null || marker.optimalHigh !== null) && (
          <ReferenceArea
            y1={marker.optimalLow ?? yMin}
            y2={marker.optimalHigh ?? yMax}
            fill={STATUS_COLOR.optimal}
            fillOpacity={0.12}
            ifOverflow="hidden"
          />
        )}
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={xDomain}
          ticks={data.map((d) => d.t)}
          tickFormatter={(t: number) =>
            new Date(t).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
          }
          tickLine={false}
          axisLine={false}
          minTickGap={16}
        />
        <YAxis hide domain={[yMin, yMax]} />
        <Tooltip
          cursor={{ strokeDasharray: "2 4" }}
          content={({ active, payload }) => {
            const d = active && (payload?.[0]?.payload as Datum | undefined);
            if (!d) return null;
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <div className="font-medium">{formatDate(d.point.date)}</div>
                <div>
                  {formatValue(d.point)}
                  {marker.unit && ` ${marker.unit}`}
                  {d.point.isCalculated && " (calc)"}
                  {STATUS_LABEL[d.point.status] && (
                    <span style={{ color: STATUS_COLOR[d.point.status] }}> · {STATUS_LABEL[d.point.status]}</span>
                  )}
                </div>
                <div className="text-muted-foreground">{SOURCE_LABEL[d.point.source]}</div>
              </div>
            );
          }}
        />
        <Line
          dataKey="value"
          type="linear"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          strokeOpacity={LINE_OPACITY}
          strokeDasharray={LINE_DASH}
          strokeLinecap="round"
          isAnimationActive={false}
          dot={(props: { cx?: number; cy?: number; payload?: Datum; index?: number }) => (
            <circle
              key={props.index}
              cx={props.cx}
              cy={props.cy}
              r={4}
              fill={props.payload ? STATUS_COLOR[props.payload.point.status] : undefined}
              stroke="var(--background)"
              strokeWidth={1.5}
            />
          )}
          activeDot={{ r: 6 }}
        >
          <LabelList dataKey="label" position="top" offset={10} className="fill-foreground text-[11px]" />
        </Line>
      </LineChart>
    </ChartContainer>
  );
}

function BandLabel({
  viewBox,
  title,
  range,
  color,
}: {
  viewBox?: { x: number; y: number; height: number };
  title: string;
  range: string;
  color: string;
}) {
  if (!viewBox || viewBox.height < 22) return null;
  const { x, y, height } = viewBox;
  return (
    <g>
      <rect x={x + 2} y={y + 2} width={3} height={height - 4} rx={1.5} fill={color} />
      <text x={x + 12} y={y + height / 2 - 2} className="fill-foreground text-[11px]">
        {title}
      </text>
      <text x={x + 12} y={y + height / 2 + 11} className="fill-muted-foreground text-[11px]">
        {range}
      </text>
    </g>
  );
}
