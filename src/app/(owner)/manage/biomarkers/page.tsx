import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ROW_LINK_ROW, RowLink } from "@/components/row-link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadBiomarkerList } from "@/lib/data";
import { formatRange } from "@/lib/status";

export const metadata = { title: "Biomarkers" };

export default function BiomarkersPage() {
  return (
    <>
      <div className="flex items-center justify-between gap-4 pt-6 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">Biomarkers</h1>
        <Button nativeButton={false} render={<Link href="/manage/biomarkers/new" />}>
          <Plus /> New biomarker
        </Button>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <BiomarkerList />
      </Suspense>
    </>
  );
}

async function BiomarkerList() {
  const list = await loadBiomarkerList();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Range</TableHead>
          <TableHead className="hidden sm:table-cell">Categories</TableHead>
          <TableHead className="text-right">Results</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((b) => (
          <TableRow key={b.slug} className={ROW_LINK_ROW}>
            <TableCell className="whitespace-normal">
              <RowLink href={`/manage/biomarkers/${b.slug}`} className="font-medium">
                {b.name}
              </RowLink>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {b.resultType === "qualitative"
                ? (b.normalValues?.join(", ") ?? "—")
                : [formatRange(b.rangeLow, b.rangeHigh), b.unit].filter(Boolean).join(" ") || "—"}
            </TableCell>
            <TableCell className="hidden whitespace-normal text-muted-foreground sm:table-cell">
              {b.categories.join(", ")}
            </TableCell>
            <TableCell className="text-right tabular-nums">{b.results}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
