"use client";

import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { ScrollStrip } from "@/components/scroll-strip";
import type { CategorySummary, MarkerSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

// A section counts as the current one once its top scrolls above this line (px from the top of
// the window): below the sticky mobile strip, with a little slack.
const SPY_LINE = 96;

// Jump links to each category section of the Data list (CategorySection gives each an id).
// Small screens: a sticky strip of chips that scrolls sideways. md and up: a sticky sidebar.
// The link for the section being read is highlighted as the page scrolls.
export function CategoryNav({
  sections,
}: {
  sections: { category: CategorySummary; markers: MarkerSummary[] }[];
}) {
  const slugs = sections.map((s) => s.category.slug);
  const slugKey = slugs.join(" ");
  const [active, setActive] = useState(slugs[0]);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ids = slugKey.split(" ");
    const update = () => {
      // The last section whose top has passed the line; at the very bottom of the page, the
      // last section, since a short one there can never reach the line.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = ids[0];
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= SPY_LINE) current = id;
      }
      setActive(atBottom ? ids[ids.length - 1] : current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [slugKey]);

  // The list streams in after the page loads, so the browser's own jump to /#<category> (the
  // biomarker page's breadcrumb) finds nothing. Jump once the sections exist.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: "instant" });
  }, []);

  // Keep the active chip in view in the sideways strip. Scrolls only the strip: scrollIntoView
  // would also nudge the page and can cancel a smooth scroll that's under way.
  useEffect(() => {
    const strip = stripRef.current;
    const chip = strip?.querySelector<HTMLElement>(`[data-slug="${active}"]`);
    if (!strip || !chip || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({ left: chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  return (
    <nav
      aria-label="Categories"
      className="sticky top-0 z-10 -mx-4 border-b bg-background/95 backdrop-blur md:top-4 md:mx-0 md:self-start md:border-b-0 md:bg-transparent md:pt-6 md:backdrop-blur-none"
    >
      <ScrollStrip ref={stripRef} viewportClassName="px-4 py-2.5 md:max-h-[calc(100vh-2rem)] md:p-0">
        <ul className="flex w-max gap-2 md:w-auto md:flex-col md:gap-0.5">
          {sections.map(({ category, markers }) => {
            const isActive = category.slug === active;
            const outCount = markers.filter((m) => m.group === "out_of_range").length;
            const inCount = markers.filter((m) => m.group === "in_range").length;
            return (
              <li key={category.slug} data-slug={category.slug} className="shrink-0">
                <a
                  href={`#${category.slug}`}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
                    "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    // Chip on small screens, sidebar row on md and up.
                    "h-8 rounded-full border px-3 md:rounded-md md:border-0 md:px-2",
                    isActive && "border-foreground bg-muted font-medium text-foreground hover:bg-muted",
                  )}
                >
                  <CategoryIcon icon={category.icon} className="size-4 shrink-0" />
                  <span className="whitespace-nowrap md:truncate">{category.name}</span>
                  {/* Sidebar only: how many are out of range and in range, each in its status color.
                      "Other" markers aren't counted here. */}
                  <span className="ml-auto hidden items-center gap-1 pl-2 text-xs font-normal tabular-nums md:flex">
                    {outCount > 0 && (
                      <span className="text-status-out">
                        <span className="sr-only">, </span>
                        {outCount}
                        <span className="sr-only"> out of range</span>
                      </span>
                    )}
                    {outCount > 0 && inCount > 0 && (
                      <span aria-hidden className="text-muted-foreground/50">
                        |
                      </span>
                    )}
                    {inCount > 0 && (
                      <span className="text-status-in">
                        <span className="sr-only">, </span>
                        {inCount}
                        <span className="sr-only"> in range</span>
                      </span>
                    )}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </ScrollStrip>
    </nav>
  );
}
