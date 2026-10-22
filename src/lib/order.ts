// Drag-to-reorder for categories and biomarkers (the manage pages' Categories tab).

// A biomarker's order is one global list, but it's dragged one category at a time. The category's
// members keep the slots they hold in the full list and only swap among them, so biomarkers in
// other categories don't move. `members` is the new order; anything not in `all` is ignored.
export function reorderWithin(all: string[], members: string[]): string[] {
  const moving = new Set(members.filter((m) => all.includes(m)));
  const queue = members.filter((m) => moving.has(m));
  return all.map((slug) => (moving.has(slug) ? queue.shift()! : slug));
}

// The report page lists results by category, then by biomarker order within it. A biomarker in
// several categories sorts under its first one.
export function compareByCategory(
  a: { categoryOrder: number; sortOrder: number; id: number },
  b: { categoryOrder: number; sortOrder: number; id: number },
) {
  return a.categoryOrder - b.categoryOrder || a.sortOrder - b.sortOrder || a.id - b.id;
}
