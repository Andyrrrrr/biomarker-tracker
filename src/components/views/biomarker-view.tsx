import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MarkerChart } from "@/components/marker-chart";
import { ResultsTable } from "@/components/results-table";
import { StatusDot, StatusLabel } from "@/components/status";
import { Button } from "@/components/ui/button";
import type { Dashboard } from "@/lib/data";
import { formatDate, formatValue } from "@/lib/format";

// `canEdit` adds the owner's edit links; share links never get them.
export function BiomarkerView({
  data,
  slug,
  basePath = "",
  canEdit = false,
}: {
  data: Dashboard;
  slug: string;
  basePath?: string;
  canEdit?: boolean;
}) {
  const { categories, markers } = data;
  const index = markers.findIndex((m) => m.slug === slug);
  if (index === -1) notFound();
  const marker = markers[index];
  const prev = markers[index - 1];
  const next = markers[index + 1];
  const category = categories.find((c) => c.slug === marker.categories[0]);
  const { latest } = marker;

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <Breadcrumbs
          items={[
            { href: basePath || "/", label: "Data" },
            // The category links to its section of the Data list (Dashboard gives each an id).
            ...(category ? [{ href: `${basePath || "/"}#${category.slug}`, label: category.name }] : []),
          ]}
        />
        <div className="flex gap-1 pt-4">
          <PrevNext href={prev && `${basePath}/biomarker/${prev.slug}`} label={prev?.name} direction="prev" />
          <PrevNext href={next && `${basePath}/biomarker/${next.slug}`} label={next?.name} direction="next" />
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 pt-2">
        <h1 className="text-3xl font-semibold tracking-tight">{marker.name}</h1>
        {canEdit && (
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/manage/biomarkers/${marker.slug}`} />}>
            <Pencil /> Edit
          </Button>
        )}
      </div>
      {marker.description && <p className="max-w-2xl pt-2 text-muted-foreground">{marker.description}</p>}

      <section className="mt-6 border-t pt-6">
        <StatusLabel status={marker.status} className="text-lg" />
        <p className="flex items-center gap-2 pt-1">
          <StatusDot status={marker.status} />
          <span className="text-xl font-semibold">{formatValue(latest)}</span>
          {marker.unit && latest.valueNumeric !== null && (
            <span className="text-sm text-muted-foreground">{marker.unit}</span>
          )}
        </p>
        <p className="pt-1 text-xs text-muted-foreground">{formatDate(latest.date)}</p>

        {marker.resultType === "numeric" && (
          <div className="pt-4">
            <MarkerChart marker={marker} />
          </div>
        )}
      </section>

      <section className="mt-8 border-t pt-6">
        <h2 className="pb-2 text-lg font-semibold">History</h2>
        <ResultsTable marker={marker} linkReports={canEdit} />
      </section>
    </>
  );
}

function PrevNext({
  href,
  label,
  direction,
}: {
  href?: string;
  label?: string;
  direction: "prev" | "next";
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const name = `${direction === "prev" ? "Previous" : "Next"}${label ? `: ${label}` : ""}`;
  if (!href) {
    return (
      <Button variant="outline" size="icon-sm" disabled aria-label={name}>
        <Icon />
      </Button>
    );
  }
  return (
    <Button variant="outline" size="icon-sm" aria-label={name} nativeButton={false} render={<Link href={href} />}>
      <Icon />
    </Button>
  );
}
