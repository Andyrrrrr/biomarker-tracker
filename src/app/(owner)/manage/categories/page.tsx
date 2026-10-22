import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { reorderCategoriesAction } from "@/actions/manage";
import { SortableList } from "@/components/manage/sortable-list";
import { Button } from "@/components/ui/button";
import { loadCategoryList } from "@/lib/data";

export const metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <div className="flex items-start justify-between gap-4 pt-6 pb-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
          <p className="pt-1 text-sm text-muted-foreground">
            Drag to set the order on the dashboard. Open a category to edit it or order its biomarkers.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/manage/categories/new" />}>
          <Plus /> New category
        </Button>
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
