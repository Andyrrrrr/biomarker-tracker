import { inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { reports, results } from "@/db/schema";
import { blockers, planImport, type Plan } from "./plan";
import type { Staging } from "./staging";

export class BlockedImportError extends Error {
  constructor(public plan: Plan) {
    super("The import has unresolved problems; run the plan and fix them first.");
  }
}

// Writes a staging file in one transaction. Re-running the same file changes nothing: stored
// results come back as "identical" and the report row is matched by source + external ID.
export async function applyImport(
  db: Db,
  staging: Staging,
  { replaceConflicts = false } = {},
) {
  return db.transaction(async (tx) => {
    const plan = await planImport(tx, staging);
    if (blockers(plan, { replaceConflicts }).length) throw new BlockedImportError(plan);

    const writes = plan.items.filter((i) => ["new", "replaces", "conflict"].includes(i.kind));
    // Nothing new from a report we haven't stored (an aggregator fully covered by lab reports):
    // don't leave an empty report behind.
    if (!writes.length && !plan.reportExists) {
      return { reportId: null, inserted: 0, replaced: 0, conflictsReplaced: 0,
        skippedIdentical: count(plan, "identical"), skippedCovered: count(plan, "covered") };
    }

    const { report } = staging;
    const meta = {
      lab: report.lab ?? null,
      collectedOn: report.collectedOn,
      collectedTime: report.collectedTime ?? null,
      orderingAccount: report.orderingAccount ?? null,
      fasting: report.fasting ?? null,
      sourceFile: report.sourceFile ?? null,
      notes: report.notes ?? null,
    };
    const [{ id: reportId }] = await tx
      .insert(reports)
      .values({ source: report.source, externalId: report.externalId, ...meta })
      .onConflictDoUpdate({ target: [reports.source, reports.externalId], set: meta })
      .returning({ id: reports.id });

    const toDelete: number[] = [];
    const toInsert = [];
    for (const item of plan.items) {
      if (item.kind === "new" || item.kind === "replaces" || item.kind === "conflict") {
        if (item.kind === "replaces") toDelete.push(...item.existing.map((e) => e.resultId));
        if (item.kind === "conflict") toDelete.push(item.existing.resultId);
        toInsert.push({ reportId, biomarkerId: item.biomarker.id, ...item.value });
      }
    }
    if (toDelete.length) await tx.delete(results).where(inArray(results.id, toDelete));
    if (toInsert.length) await tx.insert(results).values(toInsert);

    return {
      reportId,
      inserted: toInsert.length,
      replaced: count(plan, "replaces"),
      conflictsReplaced: count(plan, "conflict"),
      skippedIdentical: count(plan, "identical"),
      skippedCovered: count(plan, "covered"),
    };
  });
}

const count = (plan: Plan, kind: Plan["items"][number]["kind"]) =>
  plan.items.filter((i) => i.kind === kind).length;
