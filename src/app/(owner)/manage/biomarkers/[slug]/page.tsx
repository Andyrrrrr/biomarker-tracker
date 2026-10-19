import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BiomarkerForm } from "@/components/manage/biomarker-form";
import { MergeForm } from "@/components/manage/merge-form";
import { loadBiomarkerForEdit, loadBiomarkerOptions, loadCategories } from "@/lib/data";

export default function EditBiomarkerPage({ params }: PageProps<"/manage/biomarkers/[slug]">) {
  return (
    <Suspense fallback={<p className="pt-6 text-sm text-muted-foreground">Loading…</p>}>
      <EditBiomarker params={params} />
    </Suspense>
  );
}

async function EditBiomarker({ params }: Pick<PageProps<"/manage/biomarkers/[slug]">, "params">) {
  const { slug } = await params;
  const [biomarker, categories, options] = await Promise.all([
    loadBiomarkerForEdit(slug),
    loadCategories(),
    loadBiomarkerOptions(),
  ]);
  if (!biomarker) notFound();

  return (
    <>
      <Breadcrumbs className="pt-8" items={[{ href: "/manage/biomarkers", label: "Biomarkers" }, { label: biomarker.name }]} />
      <div className="flex flex-wrap items-baseline justify-between gap-4 pt-2 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{biomarker.name}</h1>
        {biomarker.results > 0 && (
          <Link href={`/biomarker/${slug}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            View results
          </Link>
        )}
      </div>
      <BiomarkerForm biomarker={biomarker} categories={categories}>
        <section className="mt-12 border-t pt-6">
          <h2 className="pb-2 text-lg font-semibold">Merge into another biomarker</h2>
          <MergeForm
            from={{ slug, name: biomarker.name }}
            options={options.filter((o) => o.slug !== slug && o.resultType === biomarker.resultType)}
            results={biomarker.results}
            aliases={biomarker.aliases.length}
          />
        </section>
      </BiomarkerForm>
    </>
  );
}
