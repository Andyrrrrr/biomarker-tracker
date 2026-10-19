import { Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deleteReportAction, deleteResultAction } from "@/actions/manage";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AddResultsForm } from "@/components/manage/add-results-form";
import { ConfirmButton } from "@/components/manage/confirm-button";
import { ReportForm } from "@/components/manage/report-form";
import { ResultDialog } from "@/components/manage/result-dialog";
import { StatusDot } from "@/components/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadBiomarkerOptions, loadReport } from "@/lib/data";
import { formatDate, formatValue } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/sources";
import { sameUnit } from "@/lib/units";

export default function ReportPage({ params }: PageProps<"/manage/reports/[id]">) {
  return (
    <Suspense fallback={<p className="pt-6 text-sm text-muted-foreground">Loading…</p>}>
      <Report params={params} />
    </Suspense>
  );
}

async function Report({ params }: Pick<PageProps<"/manage/reports/[id]">, "params">) {
  const id = Number((await params).id);
  const [data, options] = await Promise.all([
    Number.isInteger(id) ? loadReport(id) : null,
    loadBiomarkerOptions(),
  ]);
  if (!data) notFound();
  const { report, results } = data;
  const title = `${SOURCE_LABEL[report.source]}, ${formatDate(report.collectedOn)}`;

  return (
    <>
      <Breadcrumbs className="pt-8" items={[{ href: "/manage/reports", label: "Reports" }, { label: title }]} />
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 pb-1">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <ConfirmButton
          title="Delete this report?"
          description={`Its ${results.length === 1 ? "1 result goes" : `${results.length} results go`} with it. This can't be undone.`}
          confirm="Delete report"
          action={deleteReportAction.bind(null, report.id)}
        >
          <Trash2 /> Delete report
        </ConfirmButton>
      </div>
      <p className="pb-6 text-sm text-muted-foreground">
        {report.source === "manual"
          ? "Entered by hand"
          : [report.externalId, report.sourceFile].filter(Boolean).join(" · ")}
      </p>

      <ReportForm report={report} />

      <section className="mt-10 border-t pt-6">
        <h2 className="pb-2 text-lg font-semibold">Results</h2>
        {results.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Biomarker</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="hidden sm:table-cell">Lab range</TableHead>
                <TableHead className="w-0">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="align-top whitespace-normal">
                    <Link href={`/manage/biomarkers/${r.biomarker.slug}`} className="hover:underline">
                      {r.biomarker.name}
                    </Link>
                    {r.notes && <span className="block text-xs text-muted-foreground">{r.notes}</span>}
                  </TableCell>
                  <TableCell className="align-top">
                    <span className="inline-flex items-center gap-2">
                      <StatusDot status={r.status} />
                      <span className="font-medium">{formatValue(r)}</span>
                      {r.biomarker.unit && r.valueNumeric !== null && (
                        <span className="text-muted-foreground">{r.biomarker.unit}</span>
                      )}
                      {r.labFlag && <span className="text-xs font-semibold">{r.labFlag}</span>}
                    </span>
                    {r.reportedUnit && !sameUnit(r.reportedUnit, r.biomarker.unit) && r.valueNumeric !== null && (
                      <span className="block text-xs text-muted-foreground">
                        Reported as {r.reportedValue} {r.reportedUnit}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden align-top text-muted-foreground sm:table-cell">
                    {r.labRangeText ?? "—"}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex">
                      <ResultDialog result={r} biomarkerName={r.biomarker.name} />
                      <ConfirmButton
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${r.biomarker.name}`}
                        title={`Delete ${r.biomarker.name}?`}
                        description={`The ${formatValue(r)} result from this report. This can't be undone.`}
                        confirm="Delete"
                        action={deleteResultAction.bind(null, r.id)}
                      >
                        <Trash2 />
                      </ConfirmButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No results in this report.</p>
        )}
        <div className="pt-6">
          {/* Biomarkers already in the report aren't offered again. */}
          <AddResultsForm
            reportId={report.id}
            options={options.filter((o) => !results.some((r) => r.biomarker.slug === o.slug))}
          />
        </div>
      </section>
    </>
  );
}
