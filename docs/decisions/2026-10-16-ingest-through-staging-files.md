# Lab results enter only through staging files and the ingest scripts

**Status:** Current

**Context.** Results come from several sources (Quest PDFs, InsideTracker's export, later
Function Health) that overlap heavily, name the same test differently, use different units and
disagree after rounding. An agent reads the PDFs, and an agent's reading is the step most likely
to go subtly wrong.

**Decision.** The agent only transcribes: it writes a staging file (`imports/*.json`) with every
value exactly as printed. Deterministic, tested code in `src/ingest/` does everything else:
parsing `<`/`>`, matching names through aliases, converting units, diffing against the database
and writing in one transaction. `plan` shows the diff before `apply` writes anything, and applying
the same file twice changes nothing. The app's edit forms build the same staging objects
([hand edits](2026-10-16-hand-edits-reimport.md)).

When two sources report the same biomarker on the same day, a lab's own report outranks an
aggregator (`SOURCE_RANK` in `src/lib/sources.ts`): InsideTracker rounds values and drops `<` and
`>`, so its copy of a Quest result is skipped, or replaced if it arrived first. Aggregator-only
data (a draw with no lab report on file, InsideTracker's calculated free testosterone) is kept and
marked calculated where it is.

**Why.** Putting matching and precedence in code means they behave the same every time and are
covered by tests (`src/ingest/ingest.test.ts`); the staging file is a reviewable record of what the
agent read. The alternatives (the agent writing SQL, or a free-form parser per lab) would make
every import a new chance to double-count or silently convert wrongly. Unknown units block the
import rather than being guessed.

**Revisit if.** A source offers structured data (an API or FHIR export); it can write staging files
directly and skip the PDF step.
