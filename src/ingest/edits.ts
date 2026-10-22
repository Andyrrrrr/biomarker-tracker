import { and, asc, eq, inArray, max, ne, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import {
  biomarkerAliases,
  biomarkerCategories,
  biomarkers,
  categories,
  reports,
  results,
  type Report,
  type Result,
} from "@/db/schema";
import { formatDate } from "@/lib/format";
import {
  slugify,
  uniqueSlug,
  type BiomarkerInput,
  type CategoryInput,
  type FieldErrors,
  type ManualReportInput,
  type ReportInput,
  type ResultInput,
  type TypedResultInput,
} from "@/lib/forms";
import { normalizeName } from "@/lib/names";
import { reorderWithin } from "@/lib/order";
import { SOURCE_LABEL } from "@/lib/sources";
import { sameUnit } from "@/lib/units";
import { applyImport, BlockedImportError } from "./apply";
import { BLOCKING, blockers, ownNames, planImport, type PlanItem } from "./plan";
import type { Staging, StagingRow } from "./staging";

// Hand edits from the app (src/app/manage/). Anything that writes a result goes through
// applyImport, so a typed value is parsed, converted and ranked against other sources exactly like
// one from a lab file. Changing a stored result means deleting it and importing it again from its
// as-printed fields, inside one transaction: see docs/decisions/2026-10-16-hand-edits-reimport.md.

// A refused edit. `fields` holds messages for single inputs ("results.2.value", "unit").
export class EditError extends Error {
  constructor(
    message: string,
    public fields: FieldErrors = {},
  ) {
    super(message);
  }
}

// --- Reports and results ---------------------------------------------------------------------

// A new report of typed results, source "manual". Every submission is its own report: the
// external ID is the collection date, suffixed when that day already has a manual report.
export async function addManualReport(db: Db, input: ManualReportInput) {
  return db.transaction(async (tx) => {
    const taken = await tx
      .select({ externalId: reports.externalId })
      .from(reports)
      .where(eq(reports.source, "manual"));
    const report: Staging["report"] = {
      source: "manual",
      externalId: uniqueSlug(input.collectedOn, taken.map((t) => t.externalId)),
      collectedOn: input.collectedOn,
      collectedTime: input.collectedTime,
      lab: input.lab,
      fasting: input.fasting,
      notes: input.notes,
    };
    const { reportId } = await importTyped(tx, report, input.results);
    return { reportId: reportId! };
  });
}

// Typed results added to a stored report, of any source. A biomarker the report already has, or
// that a higher-ranked source has that day, is refused rather than silently skipped.
export async function addResults(db: Db, reportId: number, rows: TypedResultInput[]) {
  return db.transaction(async (tx) => {
    const [report] = await tx.select().from(reports).where(eq(reports.id, reportId));
    if (!report) throw new EditError("That report no longer exists.");
    await importTyped(tx, stagingReport(report), rows);
  });
}

// Plans typed rows into a report and applies them. Anything that wouldn't be stored (a blocker,
// or a row the plan would skip) becomes a message on that row, and nothing is written.
async function importTyped(tx: Db, report: Staging["report"], rows: TypedResultInput[]) {
  const picked = await tx
    .select({ slug: biomarkers.slug, name: biomarkers.name })
    .from(biomarkers)
    .where(inArray(biomarkers.slug, rows.map((r) => r.biomarker)));
  const names = new Map(picked.map((b) => [b.slug, b.name]));
  const staging: Staging = {
    report,
    results: rows.map((r) => ({ name: names.get(r.biomarker) ?? r.biomarker, biomarker: r.biomarker, ...asPrinted(r) })),
  };

  const fields: FieldErrors = {};
  for (const item of (await planImport(tx, staging)).items) {
    const message =
      item.kind === "identical"
        ? "Already in this report."
        : item.kind === "covered"
          ? `${SOURCE_LABEL[item.existing.source]} already has this biomarker that day (${item.existing.value}).`
          : BLOCKING.includes(item.kind)
            ? blockerMessage(item)
            : null;
    if (message) {
      const field = item.kind === "duplicate" || item.kind === "covered" || item.kind === "identical" ? "biomarker" : "value";
      fields[`results.${item.line - 1}.${field}`] = message;
    }
  }
  if (Object.keys(fields).length) throw new EditError("Some results can't be saved yet.", fields);
  return applyImport(tx, staging);
}

// Changes one result's as-printed fields. The biomarker and report stay the same.
export async function editResult(db: Db, resultId: number, input: ResultInput) {
  return db.transaction(async (tx) => {
    const stored = await storedResults(tx, eq(results.id, resultId));
    if (!stored.length) throw new EditError("That result no longer exists.");
    const { inserted } = await reimport(tx, stored, stored[0].slug, asPrinted(input));
    if (inserted !== 1) {
      throw new EditError("Not saved: another report from that day takes precedence for this biomarker.");
    }
  });
}

export async function deleteResult(db: Db, resultId: number) {
  await db.delete(results).where(eq(results.id, resultId));
}

// The report's own details. Its results don't move; the external ID stays, so re-importing the
// lab's file still finds this report.
export async function updateReport(db: Db, reportId: number, input: ReportInput) {
  await db.update(reports).set(input).where(eq(reports.id, reportId));
}

// Its results go with it (the foreign key cascades).
export async function deleteReport(db: Db, reportId: number) {
  await db.delete(reports).where(eq(reports.id, reportId));
}

// --- Biomarkers ------------------------------------------------------------------------------

// Creates a biomarker (slug null) or updates one, replacing its categories and aliases. A new unit
// re-imports the stored results so they're converted into it, or refuses if they can't be.
// The kind (numeric or qualitative) is fixed once created. Returns the slug.
export async function saveBiomarker(db: Db, slug: string | null, input: BiomarkerInput) {
  return db.transaction(async (tx) => {
    const [existing] = slug ? await tx.select().from(biomarkers).where(eq(biomarkers.slug, slug)) : [];
    if (slug && !existing) throw new EditError("That biomarker no longer exists.");

    const aliases = dedupeAliases(input.aliases);
    const taken = aliases.length
      ? await tx
          .select({ alias: biomarkerAliases.alias, source: biomarkerAliases.source, owner: biomarkers.name })
          .from(biomarkerAliases)
          .innerJoin(biomarkers, eq(biomarkerAliases.biomarkerId, biomarkers.id))
          .where(
            and(
              inArray(biomarkerAliases.alias, aliases.map((a) => a.alias)),
              existing ? ne(biomarkerAliases.biomarkerId, existing.id) : undefined,
            ),
          )
      : [];
    const clash = taken.find((t) => aliases.some((a) => a.alias === t.alias && a.source === t.source));
    if (clash) {
      throw new EditError("An alias is already in use.", {
        aliases: `“${clash.alias}” already points to ${clash.owner}.`,
      });
    }

    const columns = {
      name: input.name,
      shortName: input.shortName,
      description: input.description,
      unit: input.unit,
      rangeLow: input.rangeLow,
      rangeHigh: input.rangeHigh,
      optimalEnabled: input.optimalEnabled,
      optimalLow: input.optimalLow,
      optimalHigh: input.optimalHigh,
      normalValues: input.normalValues,
    };
    let id: number;
    let savedSlug: string;
    if (existing) {
      id = existing.id;
      savedSlug = existing.slug;
      await tx.update(biomarkers).set({ ...columns, updatedAt: new Date() }).where(eq(biomarkers.id, id));
    } else {
      const slugs = await tx.select({ slug: biomarkers.slug }).from(biomarkers);
      const [{ last }] = await tx.select({ last: max(biomarkers.sortOrder) }).from(biomarkers);
      savedSlug = uniqueSlug(slugify(input.name), slugs.map((s) => s.slug));
      [{ id }] = await tx
        .insert(biomarkers)
        .values({ ...columns, slug: savedSlug, resultType: input.resultType, sortOrder: (last ?? 0) + 1 })
        .returning({ id: biomarkers.id });
    }

    const categoryIds = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.slug, input.categories));
    if (!categoryIds.length) throw new EditError("Pick a category.", { categories: "Pick at least one category" });
    await tx.delete(biomarkerCategories).where(eq(biomarkerCategories.biomarkerId, id));
    await tx.insert(biomarkerCategories).values(categoryIds.map((c) => ({ biomarkerId: id, categoryId: c.id })));

    await tx.delete(biomarkerAliases).where(eq(biomarkerAliases.biomarkerId, id));
    if (aliases.length) {
      await tx.insert(biomarkerAliases).values(aliases.map((a) => ({ ...a, biomarkerId: id })));
    }

    if (existing && !sameUnit(existing.unit, input.unit)) {
      const stored = await storedResults(tx, eq(results.biomarkerId, id));
      try {
        await reimport(tx, stored, savedSlug);
      } catch (e) {
        if (!(e instanceof EditError)) throw e;
        throw new EditError("The stored results can't be converted.", {
          unit: `Can't switch to “${input.unit ?? "no unit"}”. ${e.message}`,
        });
      }
    }
    return savedSlug;
  });
}

// Moves every result and alias from one biomarker to another, then deletes the first. Its names
// become aliases of the target, so later imports of those names land there too. Results are
// re-imported under the target: converted into its unit, and dropped where the target already
// has the same value in that report or a higher-ranked source that day.
export async function mergeBiomarkers(db: Db, fromSlug: string, intoSlug: string) {
  if (fromSlug === intoSlug) throw new EditError("Pick a different biomarker to merge into.");
  return db.transaction(async (tx) => {
    const found = await tx.select().from(biomarkers).where(inArray(biomarkers.slug, [fromSlug, intoSlug]));
    const from = found.find((b) => b.slug === fromSlug);
    const into = found.find((b) => b.slug === intoSlug);
    if (!from || !into) throw new EditError("That biomarker no longer exists.");
    if (from.resultType !== into.resultType) {
      throw new EditError(`${from.name} is ${from.resultType} and ${into.name} is ${into.resultType}; only the same kind can merge.`);
    }

    const stored = await storedResults(tx, eq(results.biomarkerId, from.id));
    await tx.update(biomarkerAliases).set({ biomarkerId: into.id }).where(eq(biomarkerAliases.biomarkerId, from.id));
    await tx
      .insert(biomarkerAliases)
      .values(ownNames(from).map((alias) => ({ alias, source: null, biomarkerId: into.id })))
      .onConflictDoNothing();
    const { inserted, skipped } = await reimport(tx, stored, into.slug);
    await tx.delete(biomarkers).where(eq(biomarkers.id, from.id));
    return { into: into.slug, moved: inserted, dropped: skipped };
  });
}

// --- Shared ----------------------------------------------------------------------------------

type Stored = { result: Result; report: Report; slug: string };

async function storedResults(tx: Db, where: SQL): Promise<Stored[]> {
  return tx
    .select({ result: results, report: reports, slug: biomarkers.slug })
    .from(results)
    .innerJoin(reports, eq(results.reportId, reports.id))
    .innerJoin(biomarkers, eq(results.biomarkerId, biomarkers.id))
    .where(where)
    .orderBy(asc(reports.collectedOn), asc(results.id));
}

// Deletes these results and imports them again, one import per report, pinned to `slug`.
// `changes` overrides as-printed fields (used for a single result). A report left with no results
// (everything in it was skipped) is deleted, as an import never stores an empty one. Throws
// EditError on blockers; the caller's transaction then rolls the deletes back.
async function reimport(tx: Db, stored: Stored[], slug: string, changes?: Partial<StagingRow>) {
  let inserted = 0;
  let skipped = 0;
  if (!stored.length) return { inserted, skipped };
  await tx.delete(results).where(inArray(results.id, stored.map((s) => s.result.id)));

  const byReport = Map.groupBy(stored, (s) => s.report.id);
  for (const rows of byReport.values()) {
    const { report } = rows[0];
    const staging: Staging = {
      report: stagingReport(report),
      results: rows.map(({ result }) => ({ ...stagingRow(result, slug), ...changes })),
    };
    try {
      const summary = await applyImport(tx, staging);
      inserted += summary.inserted;
      skipped += summary.skippedIdentical + summary.skippedCovered;
    } catch (e) {
      if (!(e instanceof BlockedImportError)) throw e;
      const where = `${SOURCE_LABEL[report.source]}, ${formatDate(report.collectedOn)}`;
      throw new EditError(`${where}: ${blockers(e.plan).map(blockerMessage).join(" ")}`);
    }
  }

  const touched = [...byReport.keys()];
  const kept = await tx
    .selectDistinct({ reportId: results.reportId })
    .from(results)
    .where(inArray(results.reportId, touched));
  const empty = touched.filter((id) => !kept.some((k) => k.reportId === id));
  if (empty.length) await tx.delete(reports).where(inArray(reports.id, empty));
  return { inserted, skipped };
}

// A stored report as the staging header it came from, so re-importing into it changes nothing.
export function stagingReport(r: Report): Staging["report"] {
  return {
    source: r.source,
    externalId: r.externalId,
    lab: r.lab,
    collectedOn: r.collectedOn,
    collectedTime: r.collectedTime,
    orderingAccount: r.orderingAccount,
    fasting: r.fasting,
    sourceFile: r.sourceFile,
    notes: r.notes,
  };
}

// A stored result as the staging row it came from, pinned to a biomarker.
export function stagingRow(r: Result, slug: string): StagingRow {
  return {
    name: r.rawName,
    biomarker: slug,
    value: r.reportedValue,
    unit: r.reportedUnit,
    range: r.labRangeText,
    flag: r.labFlag,
    calculated: r.isCalculated,
    notes: r.notes,
  };
}

function asPrinted(r: ResultInput) {
  return {
    value: r.value,
    unit: r.unit,
    range: r.range,
    flag: r.flag,
    calculated: r.calculated,
    notes: r.notes,
  };
}

// Creates a category (no `current`) at the end of the order, or edits one. The slug is set once,
// from the first name, so links and imports keep working after a rename. Returns the slug.
export async function saveCategory(db: Db, current: string | null, input: CategoryInput) {
  return db.transaction(async (tx) => {
    const columns = { name: input.name, description: input.description, icon: input.icon };
    if (current) {
      const [updated] = await tx.update(categories).set(columns).where(eq(categories.slug, current)).returning();
      if (!updated) throw new EditError("That category no longer exists.");
      return updated.slug;
    }
    const slugs = await tx.select({ slug: categories.slug }).from(categories);
    const [{ last }] = await tx.select({ last: max(categories.sortOrder) }).from(categories);
    const slug = uniqueSlug(slugify(input.name), slugs.map((s) => s.slug));
    await tx.insert(categories).values({ ...columns, slug, sortOrder: (last ?? -1) + 1 });
    return slug;
  });
}

// Drag-to-reorder (src/app/(owner)/manage/categories/). Both write every row's position, 0 to n,
// so a reorder also clears ties left by older seeds.
export async function reorderCategories(db: Db, slugs: string[]) {
  await db.transaction(async (tx) => {
    const all = await tx.select({ slug: categories.slug }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
    const known = new Set(all.map((c) => c.slug));
    const order = [...new Set(slugs.filter((s) => known.has(s)))];
    if (order.length !== all.length) throw new EditError("The categories changed. Reload and try again.");
    await tx.update(categories).set({ sortOrder: positions(categories.slug, order) }).where(inArray(categories.slug, order));
  });
}

// `slugs` is one category's biomarkers in their new order; they swap among the places they hold,
// so other categories keep their order.
export async function reorderBiomarkers(db: Db, categorySlug: string, slugs: string[]) {
  await db.transaction(async (tx) => {
    const members = await tx
      .select({ slug: biomarkers.slug })
      .from(biomarkers)
      .innerJoin(biomarkerCategories, eq(biomarkerCategories.biomarkerId, biomarkers.id))
      .innerJoin(categories, eq(biomarkerCategories.categoryId, categories.id))
      .where(eq(categories.slug, categorySlug));
    const current = new Set(members.map((m) => m.slug));
    const order = [...new Set(slugs)];
    if (order.length !== current.size || !order.every((s) => current.has(s))) {
      throw new EditError("This category changed. Reload and try again.");
    }
    const all = await tx.select({ slug: biomarkers.slug }).from(biomarkers).orderBy(asc(biomarkers.sortOrder), asc(biomarkers.id));
    const next = reorderWithin(all.map((b) => b.slug), order);
    await tx.update(biomarkers).set({ sortOrder: positions(biomarkers.slug, next) }).where(inArray(biomarkers.slug, next));
  });
}

// A CASE expression giving each slug its index, so a whole list is written in one statement.
function positions(column: typeof categories.slug | typeof biomarkers.slug, order: string[]) {
  return sql<number>`case ${column} ${sql.join(order.map((s, i) => sql`when ${s} then ${i}::integer`), sql` `)} end`;
}

// One sentence per blocker, for a person rather than the CLI.
export function blockerMessage(item: PlanItem): string {
  switch (item.kind) {
    case "conflict":
      return `Already stored in this report as ${item.existing.value}.`;
    case "unit":
      return `Unknown unit: ${item.reason}.`;
    case "duplicate":
      return `Same biomarker as row ${item.firstLine}.`;
    case "unmatched":
      return `No biomarker matches “${item.row.name}”.`;
    case "invalid":
      return `${item.reason.charAt(0).toUpperCase()}${item.reason.slice(1)}.`;
    default:
      return "Can't be saved.";
  }
}

function dedupeAliases(rows: BiomarkerInput["aliases"]) {
  const seen = new Set<string>();
  return rows
    .map((r) => ({ alias: normalizeName(r.alias), source: r.source }))
    .filter((r) => {
      const key = `${r.alias}|${r.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
