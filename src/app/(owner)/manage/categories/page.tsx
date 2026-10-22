import { Suspense } from "react";
import { reorderCategoriesAction } from "@/actions/manage";
import { SortableList } from "@/components/manage/sortable-list";
import { loadCategoryList } from "@/lib/data";

export const metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <div className="pt-6 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
        <p className="pt-1 text-sm text-muted-foreground">
          Drag to set the order on the dashboard. Open a category to order its biomarkers on report pages.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <CategoryList />
      </Suspense>
    </>
  );
}

async function CategoryList() {
  const list = await loadCategoryList();
  return (
    <SortableList
      label="Categories"
      onReorder={reorderCategoriesAction}
      items={list.map((c) => ({
        id: c.slug,
        label: c.name,
        href: `/manage/categories/${c.slug}`,
        meta: `${c.biomarkers} ${c.biomarkers === 1 ? "biomarker" : "biomarkers"}`,
      }))}
    />
  );
}
