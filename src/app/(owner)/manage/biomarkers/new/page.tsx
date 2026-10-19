import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BiomarkerForm } from "@/components/manage/biomarker-form";
import { loadCategories } from "@/lib/data";

export const metadata = { title: "New biomarker" };

export default function NewBiomarkerPage() {
  return (
    <>
      <Breadcrumbs className="pt-8" items={[{ href: "/manage/biomarkers", label: "Biomarkers" }, { label: "New" }]} />
      <h1 className="pt-2 pb-6 text-3xl font-semibold tracking-tight">New biomarker</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <NewBiomarker />
      </Suspense>
    </>
  );
}

async function NewBiomarker() {
  return <BiomarkerForm categories={await loadCategories()} />;
}
