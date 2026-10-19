import type { ReportSource } from "@/db/schema";

// When two sources report the same biomarker on the same day, the higher rank wins. A lab's own
// report beats an aggregator's copy, which rounds values and drops "<" and ">".
export const SOURCE_RANK: Record<ReportSource, number> = {
  quest: 2,
  function: 2,
  manual: 2,
  insidetracker: 1,
};

export const SOURCE_LABEL: Record<ReportSource, string> = {
  quest: "Quest",
  function: "Function Health",
  manual: "Manual entry",
  insidetracker: "InsideTracker",
};
