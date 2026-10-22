import { notFound } from "next/navigation";
import { Suspense } from "react";
import { reorderBiomarkersAction } from "@/actions/manage";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CategoryForm } from "@/components/manage/category-form";
import { SortableList } from "@/components/manage/sortable-list";
import { loadCategoryOrder } from "@/lib/data";

export default function EditCategoryPage({ params }: PageProps<"/manage/categories/[slug]">) {
  return (
    <Suspense fallback={<p className="pt-6 text-sm text-muted-foreground">Loading…</p>}>
      <EditCategory params={params} />
    </Suspense>
  );
}

async function EditCategory({ params }: Pick<PageProps<"/manage/categories/[slug]">, "params">) {
  const { slug } = await params;
  const data = await loadCategoryOrder(slug);
  if (!data) notFound();

  return (
    <>
      <Breadcrumbs className="pt-8" items={[{ href: "/manage/categories", label: "Categories" }, { label: data.category.name }]} />
      <h1 className="pt-2 pb-6 text-3xl font-semibold tracking-tight">{data.category.name}</h1>
      <CategoryForm category={data.category} />
      <section className="mt-12 max-w-2xl">
        <h2 className="text-lg font-semibold">Biomarker order</h2>
        <p className="pt-1 pb-4 text-sm text-muted-foreground">
          {data.biomarkers.length
            ? "Drag to set the order these appear in on report pages."
            : "No biomarkers yet. Add this category to a biomarker on its edit page."}
        </p>
        {data.biomarkers.length > 0 && (
          <SortableList
            key={slug}
            label={`Biomarkers in ${data.category.name}`}
            onReorder={reorderBiomarkersAction.bind(null, slug)}
            items={data.biomarkers.map((b) => ({ id: b.slug, label: b.name, href: `/manage/biomarkers/${b.slug}` }))}
          />
        )}
      </section>
    </>
  );
}
