# Hand edits go through the ingest code, and only run under `next dev` for now

**Status:** Current, except the `next dev` switch: superseded by
[2026-10-17-share-links-and-owner-sign-in.md](2026-10-17-share-links-and-owner-sign-in.md), which
replaced it with the owner's sign-in.

**Context.** Phase 2 added forms (now `src/app/(owner)/manage/`) to add a report by hand, edit or delete a
result, edit a biomarker and merge two biomarkers. Each of those can change which results exist and
what they're worth, which is exactly what the ingest code exists to control
([the ingest decision](2026-10-16-ingest-through-staging-files.md)). The app also has no sign-in yet.

**Decision.** Every write that creates or changes a result builds a staging object and calls
`applyImport` (`src/ingest/edits.ts`). A manual report is a staging file with source `manual`.
Changing a stored result (editing it, moving it in a merge, or converting it after a biomarker's
unit changes) deletes it and imports it again from its as-printed fields, inside one transaction,
so a refusal rolls everything back. Deleting a result or report, and editing a report's or
biomarker's own details, write directly: they don't create or change a result's value.

The manage pages and every Server Action are switched off unless `NODE_ENV` is `development`
(an `assertEditing` guard, removed when sign-in replaced it).

**Why.** Re-importing means a typed value is parsed, unit-converted and ranked against other
sources the same way as a lab file, and a merge or unit change converts from what the lab printed
rather than compounding an earlier conversion. The ingest plan already compared only values, so
updating rows in place would have needed a second copy of the precedence and conversion rules.
Rejected: updating rows directly (skips every check), and teaching `planImport` to treat any field
change as a conflict (changes what re-running a lab file does). The development-only switch exists
because a Server Action is a public POST endpoint; without sign-in, deploying would let anyone edit.

**Revisit if.** Sign-in lands (phase 3): replace `assertEditing` with a session check. Or results
gain fields that aren't as-printed (a user's own annotation), which a re-import would need to carry
over.
