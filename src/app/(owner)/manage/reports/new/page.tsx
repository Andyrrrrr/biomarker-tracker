import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ManualReportForm } from "@/components/manage/manual-report-form";
import { loadBiomarkerOptions } from "@/lib/data";

export const metadata = { title: "Add report" };

export default function NewReportPage() {
  return (
    <>
      <Breadcrumbs className="pt-8" items={[{ href: "/manage/reports", label: "Reports" }, { label: "Add report" }]} />
      <h1 className="pt-2 text-3xl font-semibold tracking-tight">Add a report by hand</h1>
      <p className="max-w-2xl pt-2 pb-6 text-muted-foreground">
        Type values as the lab printed them. They&apos;re checked and converted the same way as an imported file, and
        replace an InsideTracker result from the same day.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <NewReport />
      </Suspense>
    </>
  );
}

async function NewReport() {
  return <ManualReportForm options={await loadBiomarkerOptions()} />;
}
