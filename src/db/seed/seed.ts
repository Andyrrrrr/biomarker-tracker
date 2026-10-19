import { inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { biomarkerAliases, biomarkerCategories, biomarkers, categories } from "@/db/schema";
import { normalizeName } from "@/lib/names";
import { BIOMARKERS, CATEGORIES } from "./catalog";

// Inserts whatever in the catalog is missing from the database. Never updates or deletes, so
// edits made in the database survive re-seeding.
export async function seedCatalog(db: Db) {
  return db.transaction(async (tx) => {
    const newCategories = await tx
      .insert(categories)
      .values(CATEGORIES.map((c, i) => ({ ...c, sortOrder: i })))
      .onConflictDoNothing()
      .returning({ id: categories.id });

    const newBiomarkers = await tx
      .insert(biomarkers)
      .values(
        BIOMARKERS.map((b, i) => ({
          slug: b.slug,
          name: b.name,
          shortName: b.shortName,
          description: b.description,
          resultType: b.qualitative ? ("qualitative" as const) : ("numeric" as const),
          unit: b.unit,
          rangeLow: b.low,
          rangeHigh: b.high,
          normalValues: b.normal,
          sortOrder: i,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: biomarkers.id });

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

    const links = BIOMARKERS.flatMap((b) =>
      b.categories.map((slug) => {
        const categoryId = categoryIds.get(slug);
        if (!categoryId) throw new Error(`${b.slug}: unknown category "${slug}"`);
        return { biomarkerId: biomarkerIds.get(b.slug)!, categoryId };
      }),
    );
    const newLinks = await tx
      .insert(biomarkerCategories)
      .values(links)
      .onConflictDoNothing()
      .returning({ id: biomarkerCategories.biomarkerId });

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
