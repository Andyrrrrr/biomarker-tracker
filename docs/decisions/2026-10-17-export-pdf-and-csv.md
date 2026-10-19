# Exports are a server-generated PDF and a CSV, both a biomarker-by-date grid

**Status:** Current

**Context.** The owner and anyone with a share link (usually a doctor) need the results outside
the app: in a spreadsheet, or as a file to attach to a chart.

**Decision.** `/export/<csv|pdf>` and `/s/<token>/export/<csv|pdf>` are route handlers that load
data through the same access-checked loaders as the pages, then hand it to `src/export/`; the
header's download menu links to them. Both files are a grid, one row per biomarker. The CSV is
plain data: rows alphabetical, no categories (a dashboard grouping), the biomarker's unit and
range, then a column per collection date. The PDF, drawn with
`@react-pdf/renderer` on the server, has the range and unit as a footnote, a column per month and
a status dot per value.

**Why.** A print stylesheet plus the browser's Save as PDF would have needed no dependency, but
it's several clicks and the output varies by browser; a one-click file was worth one library and
a second, small layout in `src/export/pdf.tsx`. The PDF uses the built-in Helvetica to avoid
shipping font files, which is why exports write "<=" instead of "≤". Columns are months, not
days, so more history fits on a portrait page; two results in one month show the later, and only
the most recent months that fit are printed. The CSV keeps every date. Lab flags, notes and
sources are left out of both: a grid has no room for them, and they're in the app.

**Revisit if.** The PDF needs charts or should match the web views closely (then a headless
browser rendering the real page beats keeping two layouts).
