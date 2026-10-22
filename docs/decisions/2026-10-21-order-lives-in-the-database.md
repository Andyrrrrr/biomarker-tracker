# Category and biomarker order lives in the database, set by dragging in the app

**Status:** Current

**Context.** The seed gave each row its position in `src/db/seed/catalog.ts`, but only when it
inserted the row. Catalog entries added later took positions that existing rows already held, so new
categories and biomarkers sorted unpredictably among old ones, and fixing that meant hand-editing
live rows.

**Decision.** The database holds the order, and the owner sets it by dragging on manage →
Categories: categories on that page, each category's biomarkers on its own page
(`src/components/manage/sortable-list.tsx`, writes in `src/ingest/edits.ts`). A save rewrites every
position 0 to n. The seed only appends: new rows go after the highest existing position, in catalog
order, so the catalog's order counts only on an empty database. For the same reason (the app owns
the data once it exists), the seed links categories only for biomarkers it just added and creates a
category only when one of those needs it, so a category deleted or unlinked in the app stays that
way (`src/db/seed/seed.ts`). The report page lists results by
category, then by biomarker order within it (`src/lib/order.ts`).

**Why.** Reordering is a display preference, so it belongs with the data rather than in code that
needs a PR and a deploy. Rejected: re-syncing positions from the catalog on every seed, which would
overwrite the app's order and make every reorder a code change. Biomarkers are dragged one category
at a time and only swap among the slots they already hold, because one list of every biomarker is
unusable and a biomarker can sit in several categories. The drag library is `@dnd-kit`, which
handles pointer, touch and keyboard dragging with screen-reader announcements.

**Revisit if.** The dashboard stops sorting biomarkers by status and name within a category, so
biomarker order would matter there too.
