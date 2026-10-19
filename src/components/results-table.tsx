import { ROW_LINK_ROW, RowLink } from "@/components/row-link";
import { StatusDot } from "@/components/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatValue } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/sources";
import { sameUnit } from "@/lib/units";
import type { MarkerSummary } from "@/lib/types";

// Every result, newest first, with the range and flag exactly as the lab printed them.
// `linkReports` makes each row open its report's edit page.
export function ResultsTable({ marker, linkReports = false }: { marker: MarkerSummary; linkReports?: boolean }) {
  const rows = [...marker.points].reverse();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Result</TableHead>
          <TableHead className="hidden sm:table-cell">Lab range</TableHead>
          <TableHead>Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id} className={linkReports ? ROW_LINK_ROW : undefined}>
            <TableCell className="align-top whitespace-nowrap">
              {linkReports ? (
                <RowLink href={`/manage/reports/${p.reportId}`}>{formatDate(p.date)}</RowLink>
              ) : (
                formatDate(p.date)
              )}
            </TableCell>
            <TableCell className="align-top">
              <span className="inline-flex items-center gap-2">
                <StatusDot status={p.status} />
                <span className="font-medium">{formatValue(p)}</span>
                {marker.unit && p.valueNumeric !== null && (
                  <span className="text-muted-foreground">{marker.unit}</span>
                )}
                {p.labFlag && <span className="text-xs font-semibold">{p.labFlag}</span>}
                {p.isCalculated && <span className="text-xs text-muted-foreground">calc</span>}
              </span>
              {p.reportedUnit && !sameUnit(p.reportedUnit, marker.unit) && p.valueNumeric !== null && (
                <span className="block text-xs text-muted-foreground">
                  Reported as {p.reportedValue} {p.reportedUnit}
                </span>
              )}
              {p.notes && (
                <span className="block max-w-xs text-xs whitespace-normal text-muted-foreground">
                  {p.notes}
                </span>
              )}
            </TableCell>
            <TableCell className="hidden align-top text-muted-foreground sm:table-cell">
              {p.labRangeText ?? "—"}
              {/* The range is in the unit the lab used; say so when that isn't ours. */}
              {p.labRangeText && p.reportedUnit && !sameUnit(p.reportedUnit, marker.unit) && ` ${p.reportedUnit}`}
            </TableCell>
            <TableCell className="align-top text-muted-foreground">{SOURCE_LABEL[p.source]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
