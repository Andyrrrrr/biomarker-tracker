"use client";

import { Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { CategoryNav } from "@/components/category-nav";
import { CategorySection } from "@/components/category-section";
import { ScrollStrip } from "@/components/scroll-strip";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { STATUS_LABEL, type StatusGroup } from "@/lib/status";
import type { CategorySummary, MarkerSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | StatusGroup;

const FILTERS: { value: Filter; label: string; color?: string }[] = [
  { value: "all", label: "All" },
  { value: "out_of_range", label: STATUS_LABEL.abnormal, color: "var(--status-out)" },
  { value: "in_range", label: STATUS_LABEL.in_range, color: "var(--status-in)" },
  { value: "other", label: "Other", color: "var(--status-other)" },
];

export function Dashboard({
  categories,
  markers,
  basePath = "",
}: {
  categories: CategorySummary[];
  markers: MarkerSummary[];
  basePath?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const matches = (m: MarkerSummary) =>
    (filter === "all" || m.group === filter) &&
    (!q || m.name.toLowerCase().includes(q) || m.shortName?.toLowerCase().includes(q));

  // Counts are per biomarker, not per row, since a biomarker can appear in several categories.
  const count = (f: Filter) => markers.filter((m) => f === "all" || m.group === f).length;

  const sections = categories
    .map((c) => ({ category: c, markers: c.markers.filter(matches) }))
    .filter((s) => s.markers.length);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 pb-6">
        {/* Our own clear button instead of the browser's: iOS Safari doesn't draw one. */}
        <InputGroup className="w-full sm:w-56">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            type="search"
            placeholder="Search biomarkers"
            aria-label="Search biomarkers"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="[&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        {/* Scrolls sideways when it doesn't fit, bleeding to the screen edge on phones like the
            category strip. The vertical padding keeps the chips' focus rings from being clipped. */}
        <ScrollStrip
          className="-mx-4 -my-1 w-[calc(100%+2rem)] sm:-mx-1 sm:w-auto sm:min-w-0 sm:flex-1"
          viewportClassName="px-4 py-1 sm:px-1"
        >
          <div className="flex w-max gap-2" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                  "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  filter === f.value && "border-foreground bg-muted font-medium",
                )}
              >
                {f.color && (
                  <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: f.color }} />
                )}
                {f.label}
                <span className="text-muted-foreground">· {count(f.value)}</span>
              </button>
            ))}
          </div>
        </ScrollStrip>
      </div>

      {sections.length ? (
        <div className="border-t md:grid md:grid-cols-[12rem_minmax(0,1fr)] md:gap-10">
          <CategoryNav sections={sections} />
          <div>
            {sections.map((s) => (
              <CategorySection key={s.category.slug} category={s.category} markers={s.markers} basePath={basePath} />
            ))}
          </div>
        </div>
      ) : (
        <p className="border-t py-12 text-center text-sm text-muted-foreground">
          No biomarkers match.
        </p>
      )}
    </>
  );
}
