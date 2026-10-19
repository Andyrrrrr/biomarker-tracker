// Shapes passed from server pages to client components (plain, serializable data).
import type { Comparator, ReportSource } from "@/db/schema";
import type { Status, StatusGroup } from "./status";

export type Point = {
  id: number;
  reportId: number;
  date: string; // YYYY-MM-DD
  valueNumeric: number | null;
  comparator: Comparator | null;
  valueText: string | null;
  reportedValue: string;
  reportedUnit: string | null;
  labRangeText: string | null;
  labFlag: string | null;
  isCalculated: boolean;
  notes: string | null;
  source: ReportSource;
  lab: string | null;
  status: Status;
};

export type MarkerSummary = {
  slug: string;
  name: string;
  shortName: string | null;
  description: string | null;
  unit: string | null;
  resultType: "numeric" | "qualitative";
  rangeLow: number | null;
  rangeHigh: number | null;
  optimalEnabled: boolean;
  optimalLow: number | null;
  optimalHigh: number | null;
  normalValues: string[] | null;
  categories: string[];
  points: Point[]; // oldest first
  latest: Point;
  status: Status;
  group: StatusGroup;
};

export type CategorySummary = {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  markers: MarkerSummary[];
};
