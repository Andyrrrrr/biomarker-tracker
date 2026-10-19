# Status and chart bands use the biomarker's range, not the lab's printed one

**Status:** Current

**Context.** Every result carries the reference range its lab printed, and those ranges change
between labs and over time (Quest's total testosterone range moved from 250–1100 to 250–827 ng/dL
when the assay changed; InsideTracker prints its own ranges).

**Decision.** In/out-of-range status and the chart's bands come from one range stored on the
biomarker (`src/lib/status.ts`), seeded from the latest Quest range and editable. Each result keeps
the lab's printed range and flag for reference; the history table shows them. An optional
"optimal" band can be switched on per biomarker. Without a range a numeric marker reads "Other".

**Why.** A chart whose bands jump between draws is hard to read, and a status that flips because a
lab changed its range rather than because the value changed is misleading. One range per marker
also lets the owner set a personal target. Rejected: per-result status from the printed range
(inconsistent over time), and two always-on ranges (more to seed and maintain for every marker).

**Revisit if.** Results for one biomarker span assays whose ranges genuinely differ enough that a
single range misreads one of them; then split the biomarker by method instead.
