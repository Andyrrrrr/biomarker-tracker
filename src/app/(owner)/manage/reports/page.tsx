import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ROW_LINK_ROW, RowLink } from "@/components/row-link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadReports } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/sources";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-4 pt-6 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <Button nativeButton={false} render={<Link href="/manage/reports/new" />}>
          <Plus /> Add report
        </Button>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ReportList />
      </Suspense>
    </>
  );
}

async function ReportList() {
  const list = await loadReports();
  if (!list.length) return <p className="border-t py-12 text-sm text-muted-foreground">No reports yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Collected</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="hidden sm:table-cell">Lab</TableHead>
          <TableHead className="text-right">Results</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((r) => (
          <TableRow key={r.id} className={ROW_LINK_ROW}>
            <TableCell>
              <RowLink href={`/manage/reports/${r.id}`} className="font-medium">
                {formatDate(r.collectedOn)}
              </RowLink>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {SOURCE_LABEL[r.source]}
              {r.source === "quest" && ` · ${r.externalId}`}
            </TableCell>
            <TableCell className="hidden text-muted-foreground sm:table-cell">{r.lab ?? "—"}</TableCell>
            <TableCell className="text-right tabular-nums">{r.results}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
