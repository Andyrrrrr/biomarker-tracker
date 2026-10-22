import { notFound } from "next/navigation";
import { Suspense } from "react";
import { reorderBiomarkersAction } from "@/actions/manage";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SortableList } from "@/components/manage/sortable-list";
import { loadCategoryOrder } from "@/lib/data";

export default function CategoryOrderPage({ params }: PageProps<"/manage/categories/[slug]">) {
  return (
    <Suspense fallback={<p className="pt-6 text-sm text-muted-foreground">Loading…</p>}>
      <CategoryOrder params={params} />
    </Suspense>
  );
}

async function CategoryOrder({ params }: Pick<PageProps<"/manage/categories/[slug]">, "params">) {
  const { slug } = await params;
  const data = await loadCategoryOrder(slug);
  if (!data) notFound();

  return (
    <>
      <Breadcrumbs className="pt-8" items={[{ href: "/manage/categories", label: "Categories" }, { label: data.category.name }]} />
      <div className="pt-2 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">{data.category.name}</h1>
        <p className="pt-1 text-sm text-muted-foreground">Drag to set the order these biomarkers appear in on report pages.</p>
      </div>
      <SortableList
        key={slug}
        label={`Biomarkers in ${data.category.name}`}
        onReorder={reorderBiomarkersAction.bind(null, slug)}
        items={data.biomarkers.map((b) => ({ id: b.slug, label: b.name, href: `/manage/biomarkers/${b.slug}` }))}
      />
    </>
  );
}
