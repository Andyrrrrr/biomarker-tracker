import Link from "next/link";
import { Sparkline } from "@/components/sparkline";
import { StatusDot } from "@/components/status";
import { STATUS_LABEL } from "@/lib/status";
import { formatMonthYear, formatValue } from "@/lib/format";
import type { MarkerSummary } from "@/lib/types";

// basePath: "" on the owner's pages, "/s/<token>" on a share link.
export function MarkerRow({ marker, basePath = "" }: { marker: MarkerSummary; basePath?: string }) {
  const { latest } = marker;
  return (
    <li>
      {/* Side padding only frames the hover fill; touch screens get no hover, so they drop it.
          The category heading in category-section.tsx does the same to stay aligned. */}
      <Link
        href={`${basePath}/biomarker/${marker.slug}`}
        className="group flex items-center gap-3 border-b py-3 pr-3 pl-4 outline-none pointer-coarse:px-0 transition-colors hover:bg-muted/50 focus-visible:bg-muted/60"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium text-pretty group-hover:underline">
            {marker.name}
          </span>
          {/* The dot alone shows the status; its name is there for screen readers. */}
          <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <StatusDot status={marker.status} />
            {STATUS_LABEL[marker.status] && <span className="sr-only">{STATUS_LABEL[marker.status]}: </span>}
            <span>
              <span className="font-medium text-foreground">{formatValue(latest)}</span>
              {marker.unit && latest.valueNumeric !== null && ` ${marker.unit}`}
            </span>
            <span aria-hidden className="text-muted-foreground/50">
              |
            </span>
            <span>{formatMonthYear(latest.date)}</span>
          </span>
        </span>
        <Sparkline marker={marker} />
      </Link>
    </li>
  );
}
