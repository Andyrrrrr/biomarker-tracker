import type { Comparator } from "@/db/schema";

export type ParsedValue =
  | { kind: "numeric"; value: number; comparator: Comparator | null }
  | { kind: "text"; text: string };

// Comparators as labs write them: "<", "< OR =", "<=", "≤", "> or =", ...
const COMPARATOR = /^(<|>)\s*(?:(?:or|OR)\s*=|=)?|^(≤|≥)/;

function readComparator(input: string): { comparator: Comparator | null; rest: string } {
  const m = input.match(COMPARATOR);
  if (!m) return { comparator: null, rest: input };
  const symbol = m[2] ?? m[1];
  const orEqual = Boolean(m[2]) || m[0].includes("=");
  const comparator = (
    symbol === "<" || symbol === "≤" ? (orEqual ? "<=" : "<") : orEqual ? ">=" : ">"
  ) as Comparator;
  return { comparator, rest: input.slice(m[0].length).trim() };
}

function readNumber(input: string): number | null {
  const cleaned = input.replace(/,/g, "");
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

// A printed result: "93", "1,802", "<0.2", "> OR = 60", or text like "Negative".
export function parseValue(raw: string): ParsedValue {
  const input = raw.trim();
  const { comparator, rest } = readComparator(input);
  const value = readNumber(rest);
  if (value !== null) return { kind: "numeric", value, comparator };
  return { kind: "text", text: input };
}

export type ParsedRange = { low: number | null; high: number | null };

// A printed reference range: "65-99", "3.8 - 10.8", "<200", "> OR = 40", "< or = 18.4".
// Returns null when it isn't one of these (tiered tables, text): keep the text, skip the numbers.
export function parseRange(raw: string | null | undefined): ParsedRange | null {
  if (!raw) return null;
  const input = raw.replace(/\(calc\)/gi, "").trim();
  const between = input.match(/^(-?[\d.,]+)\s*-\s*(-?[\d.,]+)/);
  if (between) {
    const low = readNumber(between[1]);
    const high = readNumber(between[2]);
    if (low !== null && high !== null) return { low, high };
  }
  const { comparator, rest } = readComparator(input);
  if (!comparator) return null;
  const bound = readNumber(rest.split(/\s/)[0] ?? "");
  if (bound === null) return null;
  return comparator.startsWith("<") ? { low: null, high: bound } : { low: bound, high: null };
}
