import { asc, count, desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db";
import {
  biomarkerAliases,
  biomarkerCategories,
  biomarkers,
  categories,
  reports,
  results,
  type Biomarker,
  type Category,
  type ShareLink,
} from "@/db/schema";
import { findActiveShareLink, listShareLinks, recordShareOpen } from "@/sharing/links";
import { requireOwner } from "./auth";
import { getStatus, statusGroup } from "./status";
import type { CategorySummary, MarkerSummary, Point } from "./types";

export type Dashboard = { categories: CategorySummary[]; markers: MarkerSummary[] };

// Every exported loader checks access first: the owner's session (requireOwner), or a live share
// token. Data is read fresh on every request and never cached ("use cache"): it's personal.

export async function loadDashboard(): Promise<Dashboard> {
  await requireOwner();
  return loadAll();
}

// A share link's view of everything, or null when the token is unknown, expired or revoked.
// `recordOpen` counts the visit; only the share's front page passes it.
export async function loadSharedDashboard(
  token: string,
  { recordOpen = false } = {},
): Promise<(Dashboard & { link: ShareLink }) | null> {
  await connection();
  const db = getDb();
  const link = await findActiveShareLink(db, token);
  if (!link) return null;
  if (recordOpen) await recordShareOpen(db, link.id);
  return { link, ...(await loadAll()) };
}

// The whole dataset is a few hundred rows, so it's loaded at once and shaped in memory.
// Not exported: callers go through a loader that has checked access.
async function loadAll(): Promise<Dashboard> {
  await connection();
  const db = getDb();
  const [allCategories, allBiomarkers, links, rows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select().from(biomarkers),
    db.select().from(biomarkerCategories),
    db
      .select({ result: results, report: reports })
      .from(results)
      .innerJoin(reports, eq(results.reportId, reports.id))
      .orderBy(asc(reports.collectedOn), asc(results.id)),
  ]);

  const byBiomarker = new Map<number, typeof rows>();
  for (const row of rows) {
    const list = byBiomarker.get(row.result.biomarkerId) ?? [];
    list.push(row);
    byBiomarker.set(row.result.biomarkerId, list);
  }

  const categorySlug = new Map(allCategories.map((c) => [c.id, c.slug]));
  const markers = new Map<number, MarkerSummary>();
  for (const b of allBiomarkers) {
    const own = byBiomarker.get(b.id);
    if (!own?.length) continue; // Hidden until it has a result.
    markers.set(b.id, summarize(b, own, links.filter((l) => l.biomarkerId === b.id).map((l) => categorySlug.get(l.categoryId)!)));
  }

  const summaries: CategorySummary[] = allCategories
    .map((c) => ({
      ...pickCategory(c),
      markers: sortMarkers(
        links
          .filter((l) => l.categoryId === c.id && markers.has(l.biomarkerId))
          .map((l) => markers.get(l.biomarkerId)!),
      ),
    }))
    .filter((c) => c.markers.length);

  // One entry per marker in display order, for counts and prev/next.
  const seen = new Set<string>();
  const ordered = summaries.flatMap((c) => c.markers).filter((m) => {
    if (seen.has(m.slug)) return false;
    seen.add(m.slug);
    return true;
  });

  return { categories: summaries, markers: ordered };
}

const GROUP_ORDER = { out_of_range: 0, in_range: 1, other: 2 };

// Out of range first, then in range, then no range; alphabetical within each, like Function.
function sortMarkers(list: MarkerSummary[]) {
  return list.sort(
    (a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || a.name.localeCompare(b.name),
  );
}

function pickCategory(c: Category) {
  return { slug: c.slug, name: c.name, description: c.description, icon: c.icon };
}

function summarize(
  b: Biomarker,
  rows: { result: typeof results.$inferSelect; report: typeof reports.$inferSelect }[],
  categorySlugs: string[],
): MarkerSummary {
  const points: Point[] = rows.map(({ result: r, report }) => ({
    id: r.id,
    reportId: report.id,
    date: report.collectedOn,
    valueNumeric: r.valueNumeric,
    comparator: r.comparator,
    valueText: r.valueText,
    reportedValue: r.reportedValue,
    reportedUnit: r.reportedUnit,
    labRangeText: r.labRangeText,
    labFlag: r.labFlag,
    isCalculated: r.isCalculated,
    notes: r.notes,
    source: report.source,
    lab: report.lab,
    status: getStatus(b, r),
  }));
  const latest = points[points.length - 1];
  return {
    slug: b.slug,
    name: b.name,
    shortName: b.shortName,
    description: b.description,
    unit: b.unit,
    resultType: b.resultType,
    rangeLow: b.rangeLow,
    rangeHigh: b.rangeHigh,
    optimalEnabled: b.optimalEnabled,
    optimalLow: b.optimalLow,
    optimalHigh: b.optimalHigh,
    normalValues: b.normalValues,
    categories: categorySlugs,
    points,
    latest,
    status: latest.status,
    group: statusGroup(latest.status),
  };
}

// --- The manage pages (src/app/manage/) ---

// Every biomarker, including ones with no results yet, alphabetically.
export async function loadBiomarkerList() {
  await requireOwner();
  await connection();
  const db = getDb();
  const [all, links, allCategories, counts] = await Promise.all([
    db.select().from(biomarkers).orderBy(asc(biomarkers.name)),
    db.select().from(biomarkerCategories),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db
      .select({ biomarkerId: results.biomarkerId, results: count() })
      .from(results)
      .groupBy(results.biomarkerId),
  ]);
  const categoryName = new Map(allCategories.map((c) => [c.id, c.name]));
  const resultCount = new Map(counts.map((c) => [c.biomarkerId, c.results]));
  return all.map((b) => ({
    ...b,
    categories: links.filter((l) => l.biomarkerId === b.id).map((l) => categoryName.get(l.categoryId)!),
    results: resultCount.get(b.id) ?? 0,
  }));
}

export async function loadCategories() {
  await requireOwner();
  await connection();
  return getDb().select().from(categories).orderBy(asc(categories.sortOrder));
}

// One biomarker with what its edit form shows.
export async function loadBiomarkerForEdit(slug: string) {
  await requireOwner();
  await connection();
  const db = getDb();
  const [b] = await db.select().from(biomarkers).where(eq(biomarkers.slug, slug));
  if (!b) return null;
  const [links, aliases, [{ results: resultCount }]] = await Promise.all([
    db
      .select({ slug: categories.slug })
      .from(biomarkerCategories)
      .innerJoin(categories, eq(biomarkerCategories.categoryId, categories.id))
      .where(eq(biomarkerCategories.biomarkerId, b.id)),
    db
      .select({ alias: biomarkerAliases.alias, source: biomarkerAliases.source })
      .from(biomarkerAliases)
      .where(eq(biomarkerAliases.biomarkerId, b.id))
      .orderBy(asc(biomarkerAliases.alias)),
    db.select({ results: count() }).from(results).where(eq(results.biomarkerId, b.id)),
  ]);
  return { ...b, categories: links.map((l) => l.slug), aliases, results: resultCount };
}

// For biomarker pickers.
export async function loadBiomarkerOptions() {
  await requireOwner();
  await connection();
  return getDb()
    .select({ slug: biomarkers.slug, name: biomarkers.name, unit: biomarkers.unit, resultType: biomarkers.resultType })
    .from(biomarkers)
    .orderBy(asc(biomarkers.name));
}

export type BiomarkerOption = Awaited<ReturnType<typeof loadBiomarkerOptions>>[number];

// Every report, newest first, with how many results it holds.
export async function loadReports() {
  await requireOwner();
  await connection();
  return getDb()
    .select({
      id: reports.id,
      source: reports.source,
      externalId: reports.externalId,
      lab: reports.lab,
      collectedOn: reports.collectedOn,
      results: count(results.id),
    })
    .from(reports)
    .leftJoin(results, eq(results.reportId, reports.id))
    .groupBy(reports.id)
    .orderBy(desc(reports.collectedOn), desc(reports.id));
}

// One report and its results, in catalog order.
export async function loadReport(id: number) {
  await requireOwner();
  await connection();
  const db = getDb();
  const [report] = await db.select().from(reports).where(eq(reports.id, id));
  if (!report) return null;
  const rows = await db
    .select({ result: results, biomarker: biomarkers })
    .from(results)
    .innerJoin(biomarkers, eq(results.biomarkerId, biomarkers.id))
    .where(eq(results.reportId, id))
    .orderBy(asc(biomarkers.sortOrder));
  return {
    report,
    results: rows.map(({ result, biomarker: b }) => ({
      ...result,
      biomarker: { slug: b.slug, name: b.name, unit: b.unit },
      status: getStatus(b, result),
    })),
  };
}

// Every share link, newest first.
export async function loadShareLinks() {
  await requireOwner();
  await connection();
  return listShareLinks(getDb());
}
