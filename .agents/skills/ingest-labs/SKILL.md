---
name: ingest-labs
description: Add lab results to the biomarker database from a PDF or other source (Quest, InsideTracker, Function Health, a photo, typed values). Use for "ingest this", "add these results", "import my bloodwork", or a new file in data/.
---

# Ingest lab results

You read the source; the scripts match, convert, diff and write. Never write results with SQL or
any other path: precedence, dedupe and unit checks live in `src/ingest/`.

## 1. Read the source

- PDFs: `pdftotext -layout <file> -` (text-based reports read cleanly; no OCR needed for Quest).
- Check what's already stored: `npm run ingest -- reports`.
- One staging file per report (per specimen ID for Quest; two specimens on one day are two files).

## 2. Write the staging file

`imports/<collectedOn>-<source>-<externalId>.json` (gitignored). Shape: `src/ingest/staging.ts`.

```json
{
  "report": {
    "source": "quest",
    "externalId": "AB123456C",
    "lab": "Quest Diagnostics",
    "collectedOn": "2020-03-10",
    "collectedTime": "08:00",
    "orderingAccount": "InsideTracker",
    "fasting": true,
    "sourceFile": "<pdf filename in data/>"
  },
  "results": [
    { "name": "HS CRP", "value": "<0.2", "unit": "mg/L", "range": "Optimal <1.0" },
    { "name": "TESTOSTERONE, FREE", "value": "40.5", "unit": "pg/mL", "range": "46.0-224.0", "flag": "L" },
    { "name": "IRON BINDING CAPACITY", "value": "340", "unit": "mcg/dL", "range": "250-425", "calculated": true }
  ]
}
```

Copy names, values, units and ranges **as printed**. The plan does the parsing. Rules:

- **externalId:** Quest's specimen ID; for sources without one (InsideTracker), the collection date.
- **value:** keep `<` and `>` (`"<0.2"`, `"> OR = 60"`). Skip rows with no result ("SEE NOTE:",
  "Not Reported", house-account blocks).
- **range:** the line labeled Reference Range. For tiered tables (Optimal / Moderate / High;
  Low / Borderline / Normal), use the tier the lab flags against (`"<90"`, `">5.4"`). Leave out
  interpretation text.
- **calculated:** `true` for values marked `(calc)`. Drop `(calc)` from the unit.
- **flag:** `H`, `L` or whatever the lab printed beside the value.
- **notes:** assay or method changes worth knowing (testosterone "MS" vs "IA", cortisol "A.M.").
- **The same analyte twice in one report** (Albumin in the CMP and in a testosterone panel): keep
  the main panel's row and mention the other in its `notes`.
- **InsideTracker:** one file per date column. Its export rounds values and drops `<`/`>`, so copy
  every row anyway; the plan skips whatever a lab report already covers.
- **biomarker:** set a slug only when the printed name can't match on its own.

## 3. Plan

`npm run ingest -- plan imports/<file>.json`

It groups every row: new, replaces a lower-ranked source, already stored, covered by a
higher-ranked source, and the blockers.

- **Unmatched name** for a biomarker that exists: add the printed name to that biomarker's
  `aliases` in `src/db/seed/catalog.ts` (or `sourceAliases` when the name means something else at
  other sources), then `npm run db:seed`.
- **Unmatched name with no biomarker yet:** propose one to Andy: name, unit, category, a short
  description in your own words (never copied from a lab or Function Health), and the lab's range.
  On a yes, add it to `catalog.ts` and run `npm run db:seed`.
- **Unit problem:** a real conversion goes in `src/lib/units.ts` with a test. Never convert by hand
  in the staging file.
- **Conflict** (stored with a different value): show Andy both and the source; apply with
  `--replace-conflicts` only on his say-so.
- **Duplicate** or **invalid:** fix the staging file.

Re-run the plan until it says "No blockers".

## 4. Apply

Show Andy the plan summary and ask before writing: this is his live database.

`npm run ingest -- apply imports/<file>.json`

Applying the same file again changes nothing, so re-running after a fix is safe.

## Order for a batch

Lab reports first, oldest to newest, then aggregators (InsideTracker). Order doesn't change the
result (a lab report replaces an aggregator's same-day value either way), but it keeps each plan
short.
