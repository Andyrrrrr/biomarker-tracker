import { z } from "zod";
import { reportSource } from "@/db/schema";
import { isCategoryIcon } from "./category-icons";

// Parsing for the edit forms in src/app/manage/. Every field arrives from FormData as a string;
// these schemas turn blanks into null, check numbers and return messages keyed by field name, so
// a form can show each one under its input.

export type FieldErrors = Record<string, string>;

// What a form's Server Action returns: a message, plus messages for single fields.
export type FormState = { ok?: boolean; message?: string; fields?: FieldErrors } | undefined;

// Field names become object keys, so a name like "__proto__.x" would write to Object.prototype
// for the whole server process. No form uses these names; drop them.
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// A form's submitted fields as a plain object. Dotted names become nested rows
// ("results.0.value"), names ending in "[]" collect every value ("categories[]").
export function readForm(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [rawKey, raw] of formData.entries()) {
    if (rawKey.startsWith("$ACTION")) continue;
    const value = typeof raw === "string" ? raw : "";
    const isList = rawKey.endsWith("[]");
    const path = (isList ? rawKey.slice(0, -2) : rawKey).split(".");
    if (path.some((part) => UNSAFE_KEYS.has(part))) continue;
    let node: Record<string, unknown> = out;
    for (const [i, part] of path.slice(0, -1).entries()) {
      const nextIsIndex = /^\d+$/.test(path[i + 1]);
      node[part] ??= nextIsIndex ? [] : {};
      node = node[part] as Record<string, unknown>;
    }
    const last = path[path.length - 1];
    if (isList) ((node[last] ??= []) as string[]).push(value);
    else node[last] = value;
  }
  // Removed rows leave holes in the indexes; close them up.
  return compact(out) as Record<string, unknown>;
}

function compact(node: unknown): unknown {
  if (Array.isArray(node)) return node.filter((n) => n !== undefined).map(compact);
  if (node && typeof node === "object") {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, compact(v)]));
  }
  return node;
}

// Messages keyed by field path ("rangeLow", "results.2.value"); the first message per field wins.
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

const text = z
  .string()
  .optional()
  .transform((v) => v?.trim() || null);

const required = (message: string) => z.string({ error: message }).trim().min(1, message);

const number = z
  .string()
  .optional()
  .transform((v, ctx) => {
    const trimmed = v?.trim().replace(/,/g, "");
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: "Enter a number" });
      return z.NEVER;
    }
    return n;
  });

const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

// Fasting: "unknown" (or blank) means not recorded.
const yesNo = z
  .enum(["", "unknown", "yes", "no"])
  .optional()
  .transform((v) => (v === "yes" ? true : v === "no" ? false : null));

const date = z.string({ error: "Enter a date" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date");

// One name per line or comma; blanks and repeats dropped.
const list = z
  .string()
  .optional()
  .transform((v) => [...new Set((v ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean))]);

const lowHigh = <T extends { [k: string]: unknown }>(
  value: T,
  ctx: z.RefinementCtx,
  low: keyof T & string,
  high: keyof T & string,
) => {
  const l = value[low] as number | null;
  const h = value[high] as number | null;
  if (l !== null && h !== null && l > h) {
    ctx.addIssue({ code: "custom", path: [high], message: "Must be at least the low end" });
  }
};

export const biomarkerForm = z
  .object({
    name: required("Enter a name"),
    shortName: text,
    description: text,
    resultType: z.enum(["numeric", "qualitative"]).default("numeric"),
    unit: text,
    rangeLow: number,
    rangeHigh: number,
    optimalEnabled: checkbox,
    optimalLow: number,
    optimalHigh: number,
    normalValues: list,
    categories: z.array(z.string()).default([]),
    aliases: z
      .array(
        z.object({
          alias: text,
          // "any" (or blank): the alias applies to every source.
          source: z
            .enum(["", "any", ...reportSource.enumValues])
            .optional()
            .transform((v) => (v && v !== "any" ? v : null)),
        }),
      )
      .default([])
      .transform((rows) =>
        rows.flatMap((r) => (r.alias ? [{ alias: r.alias, source: r.source }] : [])),
      ),
  })
  .superRefine((v, ctx) => {
    lowHigh(v, ctx, "rangeLow", "rangeHigh");
    lowHigh(v, ctx, "optimalLow", "optimalHigh");
    if (v.optimalEnabled && v.optimalLow === null && v.optimalHigh === null) {
      ctx.addIssue({ code: "custom", path: ["optimalLow"], message: "Set at least one end" });
    }
    if (!v.categories.length) {
      ctx.addIssue({ code: "custom", path: ["categories"], message: "Pick at least one category" });
    }
  })
  .transform((v) => ({
    ...v,
    // Fields that don't apply to the marker's kind are stored empty.
    unit: v.resultType === "numeric" ? v.unit : null,
    normalValues: v.resultType === "qualitative" && v.normalValues.length ? v.normalValues : null,
  }));

export type BiomarkerInput = z.output<typeof biomarkerForm>;

export const categoryForm = z.object({
  name: required("Enter a name"),
  description: text,
  icon: z.string({ error: "Pick an icon" }).refine(isCategoryIcon, "Pick an icon"),
});

export type CategoryInput = z.output<typeof categoryForm>;

export const reportForm = z.object({
  collectedOn: date,
  collectedTime: text,
  lab: text,
  fasting: yesNo,
  notes: text,
});

export type ReportInput = z.output<typeof reportForm>;

// A result as typed: the same as-printed fields a staging file carries (src/ingest/staging.ts).
export const resultForm = z.object({
  value: required("Enter a value"),
  unit: text,
  range: text,
  flag: text,
  calculated: checkbox,
  notes: text,
});

export type ResultInput = z.output<typeof resultForm>;

// Rows of typed results, each naming its biomarker by slug.
const typedResults = z
  .array(resultForm.extend({ biomarker: required("Pick a biomarker") }))
  .min(1, "Add at least one result")
  // prefault, not default: a missing list still has to pass min(1).
  .prefault([]);

export type TypedResultInput = z.output<typeof typedResults>[number];

export const manualReportForm = reportForm.extend({ results: typedResults });

// Results added to a report that already exists.
export const addResultsForm = z.object({ results: typedResults });

export type ManualReportInput = z.output<typeof manualReportForm>;

// "Vitamin B12 (Cobalamin)" → "vitamin-b12-cobalamin".
export function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "biomarker"
  );
}

// The slug, or the slug with the first free "-2", "-3"… suffix.
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}
