import { inArray, max } from "drizzle-orm";
import type { Db } from "@/db";
import { biomarkerAliases, biomarkerCategories, biomarkers, categories } from "@/db/schema";
import { normalizeName } from "@/lib/names";
import { BIOMARKERS, CATEGORIES } from "./catalog";

// Adds catalog entries the database doesn't have yet. It never updates or deletes, and it only
// fills in around new biomarkers, so what's removed in the app stays removed:
// - Biomarkers: any catalog slug the database lacks.
// - Category links: only for the biomarkers this run added. A link removed in the app isn't
//   restored, and giving an existing biomarker another category is done in the app.
// - Categories: all of them on an empty database; after that, only ones a new biomarker needs.
//   The database can't tell a deleted category from one new to the catalog, so a deleted one
//   comes back only if a newly added biomarker lists it.
// - Aliases: every catalog alias the database lacks, so adding a name to catalog.ts and seeding
//   is how an import learns it.
// New rows go after everything already there, in catalog order; order is edited in the app
// (manage → Categories), so the catalog's order only counts on an empty database.
export async function seedCatalog(db: Db) {
  return db.transaction(async (tx) => {
    const haveBiomarkers = new Set((await tx.select({ slug: biomarkers.slug }).from(biomarkers)).map((b) => b.slug));
    const [{ lastBiomarker }] = await tx.select({ lastBiomarker: max(biomarkers.sortOrder) }).from(biomarkers);
    const missingBiomarkers = BIOMARKERS.filter((b) => !haveBiomarkers.has(b.slug));
    const newBiomarkers = missingBiomarkers.length
      ? await tx
          .insert(biomarkers)
          .values(
            missingBiomarkers.map((b, i) => ({
              slug: b.slug,
              name: b.name,
              shortName: b.shortName,
              description: b.description,
              resultType: b.qualitative ? ("qualitative" as const) : ("numeric" as const),
              unit: b.unit,
              rangeLow: b.low,
              rangeHigh: b.high,
              normalValues: b.normal,
              sortOrder: (lastBiomarker ?? -1) + 1 + i,
            })),
          )
          .onConflictDoNothing()
          .returning({ id: biomarkers.id })
      : [];

    const haveCategories = new Set((await tx.select({ slug: categories.slug }).from(categories)).map((c) => c.slug));
    const needed = new Set(missingBiomarkers.flatMap((b) => b.categories));
    const missingCategories = CATEGORIES.filter(
      (c) => !haveCategories.has(c.slug) && (!haveCategories.size || needed.has(c.slug)),
    );
    const [{ lastCategory }] = await tx.select({ lastCategory: max(categories.sortOrder) }).from(categories);
    const newCategories = missingCategories.length
      ? await tx
          .insert(categories)
          .values(missingCategories.map((c, i) => ({ ...c, sortOrder: (lastCategory ?? -1) + 1 + i })))
          .onConflictDoNothing()
          .returning({ id: categories.id })
      : [];

    const categoryIds = new Map(
      (await tx.select({ id: categories.id, slug: categories.slug }).from(categories)).map((c) => [
        c.slug,
        c.id,
      ]),
    );
    const biomarkerIds = new Map(
      (
        await tx
          .select({ id: biomarkers.id, slug: biomarkers.slug })
          .from(biomarkers)
          .where(inArray(biomarkers.slug, BIOMARKERS.map((b) => b.slug)))
      ).map((b) => [b.slug, b.id]),
    );

    const links = missingBiomarkers.flatMap((b) =>
      b.categories.map((slug) => {
        const categoryId = categoryIds.get(slug);
        if (!categoryId) throw new Error(`${b.slug}: unknown category "${slug}"`);
        return { biomarkerId: biomarkerIds.get(b.slug)!, categoryId };
      }),
    );
    const newLinks = links.length
      ? await tx
          .insert(biomarkerCategories)
          .values(links)
          .onConflictDoNothing()
          .returning({ id: biomarkerCategories.biomarkerId })
      : [];

    const aliases = BIOMARKERS.flatMap((b) => {
      const biomarkerId = biomarkerIds.get(b.slug)!;
      return [
        ...(b.aliases ?? []).map((a) => ({ biomarkerId, alias: normalizeName(a), source: null })),
        ...Object.entries(b.sourceAliases ?? {}).flatMap(([source, names]) =>
          names.map((a) => ({
            biomarkerId,
            alias: normalizeName(a),
            source: source as keyof NonNullable<typeof b.sourceAliases>,
          })),
        ),
      ];
    });
    const newAliases = aliases.length
      ? await tx
          .insert(biomarkerAliases)
          .values(aliases)
          .onConflictDoNothing()
          .returning({ id: biomarkerAliases.id })
      : [];

    return {
      categories: newCategories.length,
      biomarkers: newBiomarkers.length,
      categoryLinks: newLinks.length,
      aliases: newAliases.length,
    };
  });
}
