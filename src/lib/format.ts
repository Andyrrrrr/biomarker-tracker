import type { Comparator } from "@/db/schema";
import type { Point } from "./types";

const COMPARATOR_TEXT: Record<Comparator, string> = { "<": "<", "<=": "≤", ">": ">", ">=": "≥" };

// "<0.2", "47.7", "Negative". `ascii` writes "<=" for "≤", for exports: the PDF's built-in font
// has no "≤", and spreadsheets handle plain text better.
export function formatValue(
  p: Pick<Point, "valueNumeric" | "comparator" | "valueText">,
  { ascii = false } = {},
): string {
  if (p.valueNumeric === null) return p.valueText ?? "—";
  const comparator = p.comparator ? (ascii ? p.comparator : COMPARATOR_TEXT[p.comparator]) : "";
  return `${comparator}${p.valueNumeric}`;
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// "Jan 5, 2024". Dates are calendar days, so they're read as UTC to avoid shifting a day.
export function formatDate(date: string): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}

const monthFormat = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

// "Aug '25", for the PDF's month columns.
export function formatMonth(date: string): string {
  return `${monthFormat.format(new Date(`${date}T00:00:00Z`))} '${date.slice(2, 4)}`;
}

// "Aug 2025", for the list rows' test date.
export function formatMonthYear(date: string): string {
  return `${monthFormat.format(new Date(`${date}T00:00:00Z`))} ${date.slice(0, 4)}`;
}
