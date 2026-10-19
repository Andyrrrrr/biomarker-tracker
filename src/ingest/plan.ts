import { and, eq, ne, or } from "drizzle-orm";
import type { Db } from "@/db";
import {
  biomarkerAliases,
  biomarkers,
  reports,
  results,
  type Biomarker,
  type Comparator,
  type ReportSource,
} from "@/db/schema";
import { normalizeName } from "@/lib/names";
import { SOURCE_RANK } from "@/lib/sources";
import { convertValue } from "@/lib/units";
import { parseRange, parseValue } from "@/lib/values";
import type { Staging, StagingRow } from "./staging";

// What one result would become: the columns of a `results` row, minus the ids.
export type ResolvedValue = {
  valueNumeric: number | null;
  comparator: Comparator | null;
  valueText: string | null;
  reportedValue: string;
  reportedUnit: string | null;
  labRangeText: string | null;
  labRangeLow: number | null;
  labRangeHigh: number | null;
  labFlag: string | null;
  isCalculated: boolean;
  rawName: string;
  notes: string | null;
};

type Existing = {
  resultId: number;
  value: string;
  source: ReportSource;
  externalId: string;
};

type Base = { row: StagingRow; line: number };
type Matched = Base & { biomarker: Biomarker };

export type PlanItem =
  // Will be inserted. `sameDay` lists same-rank results from other reports that day (kept too).
  | (Matched & { kind: "new"; value: ResolvedValue; sameDay: Existing[] })
  // Already stored with this value; skipped.
  | (Matched & { kind: "identical"; existing: Existing })
  // Will be inserted, deleting a lower-ranked source's result for the same day.
  | (Matched & { kind: "replaces"; value: ResolvedValue; existing: Existing[] })
  // A higher-ranked source already has this biomarker that day; skipped.
  | (Matched & { kind: "covered"; existing: Existing })
  // Blockers: apply refuses until they're resolved.
  | (Matched & { kind: "conflict"; value: ResolvedValue; existing: Existing })
  | (Matched & { kind: "unit"; reason: string })
  | (Matched & { kind: "duplicate"; firstLine: number })
  | (Base & { kind: "unmatched" })
  | (Base & { kind: "invalid"; reason: string });

export const BLOCKING: PlanItem["kind"][] = ["conflict", "unit", "duplicate", "unmatched", "invalid"];

export type Plan = {
  staging: Staging;
  reportExists: boolean;
  items: PlanItem[];
};

export async function planImport(db: Db, staging: Staging): Promise<Plan> {
  const { report } = staging;
  const allBiomarkers = await db.select().from(biomarkers);
  const allAliases = await db.select().from(biomarkerAliases);
  const bySlug = new Map(allBiomarkers.map((b) => [b.slug, b]));
  const byId = new Map(allBiomarkers.map((b) => [b.id, b]));

  // Name lookup, most specific first: this source's aliases, any-source aliases, then names.
  const sourceAlias = new Map<string, Biomarker>();
  const anyAlias = new Map<string, Biomarker>();
  for (const a of allAliases) {
    const b = byId.get(a.biomarkerId)!;
    if (a.source === report.source) sourceAlias.set(a.alias, b);
    else if (a.source === null) anyAlias.set(a.alias, b);
  }
  const byName = new Map<string, Biomarker>();
  for (const b of allBiomarkers) {
    for (const name of ownNames(b)) if (!byName.has(name)) byName.set(name, b);
  }
  const match = (row: StagingRow) => {
    if (row.biomarker) return bySlug.get(row.biomarker);
    const n = normalizeName(row.name);
    return sourceAlias.get(n) ?? anyAlias.get(n) ?? byName.get(n);
  };

  const [thisReport] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.source, report.source), eq(reports.externalId, report.externalId)));

  // Results already stored for this report, and from other reports collected the same day.
  const stored = await db
    .select({
      resultId: results.id,
      biomarkerId: results.biomarkerId,
      reportId: results.reportId,
      value: results.reportedValue,
      valueNumeric: results.valueNumeric,
      comparator: results.comparator,
      valueText: results.valueText,
      source: reports.source,
      externalId: reports.externalId,
    })
    .from(results)
    .innerJoin(reports, eq(results.reportId, reports.id))
    .where(
      or(
        thisReport ? eq(results.reportId, thisReport.id) : undefined,
        and(
          eq(reports.collectedOn, report.collectedOn),
          thisReport ? ne(reports.id, thisReport.id) : undefined,
        ),
      ),
    );

  const items: PlanItem[] = [];
  const seen = new Map<number, number>();

  staging.results.forEach((row, i) => {
    const line = i + 1;
    const biomarker = match(row);
    if (!biomarker) {
      items.push(
        row.biomarker
          ? { kind: "invalid", row, line, reason: `no biomarker with slug "${row.biomarker}"` }
          : { kind: "unmatched", row, line },
      );
      return;
    }

    const firstLine = seen.get(biomarker.id);
    if (firstLine) {
      items.push({ kind: "duplicate", row, line, biomarker, firstLine });
      return;
    }
    seen.set(biomarker.id, line);

    const resolved = resolveValue(row, biomarker);
    if ("problem" in resolved) {
      items.push({ ...resolved.problem, row, line, biomarker });
      return;
    }
    const value = resolved.value;

    const mine = stored.find((s) => s.biomarkerId === biomarker.id && s.reportId === thisReport?.id);
    if (mine) {
      const existing = toExisting(mine);
      const same =
        mine.valueNumeric === value.valueNumeric &&
        mine.comparator === value.comparator &&
        (mine.valueText ?? null) === value.valueText;
      items.push(
        same
          ? { kind: "identical", row, line, biomarker, existing }
          : { kind: "conflict", row, line, biomarker, value, existing },
      );
      return;
    }

    const others = stored.filter(
      (s) => s.biomarkerId === biomarker.id && s.reportId !== thisReport?.id,
    );
    const rank = SOURCE_RANK[report.source];
    const higher = others.find((s) => SOURCE_RANK[s.source] > rank);
    if (higher) {
      items.push({ kind: "covered", row, line, biomarker, existing: toExisting(higher) });
      return;
    }
    const lower = others.filter((s) => SOURCE_RANK[s.source] < rank);
    if (lower.length) {
      items.push({ kind: "replaces", row, line, biomarker, value, existing: lower.map(toExisting) });
      return;
    }
    items.push({ kind: "new", row, line, biomarker, value, sameDay: others.map(toExisting) });
  });

  return { staging, reportExists: Boolean(thisReport), items };
}

// The normalized names a biomarker matches without an alias. Names count with and without a
// trailing abbreviation: "Alkaline Phosphatase (ALP)" also matches "ALKALINE PHOSPHATASE".
export function ownNames(b: Pick<Biomarker, "name" | "shortName">): string[] {
  const names = [b.name, b.name.replace(/\s*\([^)]*\)$/, ""), b.shortName];
  return [...new Set(names.filter((n): n is string => Boolean(n)).map(normalizeName))];
}

function toExisting(s: { resultId: number; value: string; source: ReportSource; externalId: string }) {
  return { resultId: s.resultId, value: s.value, source: s.source, externalId: s.externalId };
}

type Problem = { kind: "unit" | "invalid"; reason: string };

function resolveValue(
  row: StagingRow,
  biomarker: Biomarker,
): { value: ResolvedValue } | { problem: Problem } {
  const parsedRange = parseRange(row.range);
  const base = {
    reportedValue: row.value,
    reportedUnit: row.unit ?? null,
    labRangeText: row.range ?? null,
    labRangeLow: parsedRange?.low ?? null,
    labRangeHigh: parsedRange?.high ?? null,
    labFlag: row.flag ?? null,
    isCalculated: row.calculated ?? false,
    rawName: row.name,
    notes: row.notes ?? null,
  };

  if (biomarker.resultType === "qualitative") {
    return { value: { ...base, valueNumeric: null, comparator: null, valueText: row.value.trim() } };
  }

  const parsed = parseValue(row.value);
  if (parsed.kind === "text") {
    return { problem: { kind: "invalid", reason: `"${row.value}" isn't a number` } };
  }
  const converted = convertValue(parsed.value, row.unit, biomarker.unit, biomarker.slug);
  if (converted === null) {
    return {
      problem: {
        kind: "unit",
        reason: `reported in "${row.unit ?? "no unit"}", biomarker uses "${biomarker.unit ?? "no unit"}"`,
      },
    };
  }
  return {
    value: { ...base, valueNumeric: converted, comparator: parsed.comparator, valueText: null },
  };
}

export function blockers(plan: Plan, { replaceConflicts = false } = {}) {
  return plan.items.filter(
    (i) => BLOCKING.includes(i.kind) && !(replaceConflicts && i.kind === "conflict"),
  );
}
