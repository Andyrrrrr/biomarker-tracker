# Decisions

Why the project is shaped the way it is: one file per decision, with an index below.

An entry earns its place when someone six months from now would otherwise undo the decision without
knowing why it was made. Record the reasoning, not the diff; git already has the diff.

## Writing an entry

- Name it `docs/decisions/YYYY-MM-DD-short-slug.md`. Write it for someone who wasn't there: full
  sentences, terms explained, as long as the reasoning needs. The investigation story (logs,
  timelines, false trails) goes in the issue or the commit message, not here.
- Add one line to the index below, newest first, in the same commit.
- When a new decision reverses an old one, set the old entry's **Status** to
  `Superseded by <file>` and update its index line. Never leave two current-looking answers.

```md
# <The decision, as a sentence>

**Status:** Current · **Issue:** #n

**Context.** One or two sentences on what forced a choice.

**Decision.** What was chosen.

**Why.** The reasoning, including what was rejected and why.

**Revisit if.** What would have to change for this to be worth reopening.
```

## Index

| Date | Decision | Status |
| ---- | -------- | ------ |
| 2026-10-21 | [Category and biomarker order lives in the database, set by dragging in the app](2026-10-21-order-lives-in-the-database.md) | Current |
| 2026-10-17 | [Exports are a server-generated PDF and a CSV, both a biomarker-by-date grid](2026-10-17-export-pdf-and-csv.md) | Current |
| 2026-10-17 | [One owner signs in by email link; doctors get unguessable share links](2026-10-17-share-links-and-owner-sign-in.md) | Current |
| 2026-10-16 | [Hand edits go through the ingest code](2026-10-16-hand-edits-reimport.md) | Current; its `next dev` switch superseded by 2026-10-17 |
| 2026-10-16 | [Status and chart bands use the biomarker's range](2026-10-16-status-uses-biomarker-range.md) | Current |
| 2026-10-16 | [Results enter only through staging files and the ingest scripts](2026-10-16-ingest-through-staging-files.md) | Current |
