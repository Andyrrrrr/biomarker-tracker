import { CategoryIcon } from "@/components/category-icon";
import { MarkerRow } from "@/components/marker-row";
import type { CategorySummary, MarkerSummary } from "@/lib/types";

// One category's block of the Data list. Its id is the category slug, the target of the
// category nav and of the biomarker page's breadcrumb (/#<slug>). The scroll margin keeps the
// heading clear of the sticky nav strip on small screens. On md and up it lands the heading 40px
// from the top, level with the sidebar's first link (CategoryNav: md:top-4 + md:pt-6), so it
// subtracts the section's own top padding (pt-14, or pt-6 for the first).
export function CategorySection({
  category,
  markers,
  basePath = "",
}: {
  category: CategorySummary;
  markers: MarkerSummary[];
  basePath?: string;
}) {
  return (
    <section id={category.slug} aria-labelledby={`${category.slug}-heading`} className="scroll-mt-16 pt-14 first:pt-6 md:-scroll-mt-4 md:first:scroll-mt-4">
      <h2 id={`${category.slug}-heading`} className="flex items-baseline gap-2.5 border-b pr-3 pb-3 pl-4 text-xl pointer-coarse:px-0 font-semibold">
        <CategoryIcon icon={category.icon} className="size-5.5 self-center text-muted-foreground" />
        {category.name}
        <span className="text-base font-normal text-muted-foreground">{markers.length}</span>
      </h2>
      <ul>
        {markers.map((m) => (
          <MarkerRow key={m.slug} marker={m} basePath={basePath} />
        ))}
      </ul>
    </section>
  );
}
