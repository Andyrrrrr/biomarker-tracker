import { Breadcrumbs } from "@/components/breadcrumbs";
import { CategoryForm } from "@/components/manage/category-form";

export const metadata = { title: "New category" };

export default function NewCategoryPage() {
  return (
    <>
      <Breadcrumbs className="pt-8" items={[{ href: "/manage/categories", label: "Categories" }, { label: "New" }]} />
      <h1 className="pt-2 pb-6 text-3xl font-semibold tracking-tight">New category</h1>
      <CategoryForm />
    </>
  );
}
