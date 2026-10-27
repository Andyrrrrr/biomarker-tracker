# Biomarker Tracker — agent guide

A personal bloodwork tracker: a Function Health–style dashboard over a lifetime of lab results,
filled by an agent ingest skill. Next.js 16 (App Router) + shadcn/ui + Drizzle on Supabase Postgres.
Private for now; may be open-sourced.

If `AGENTS.local.md` exists at the repo root, read and follow it (gitignored, per-developer).

## How these docs work

1. **Files that load every session are written for agents, and stay short**: `AGENTS.md`,
   `AGENTS.local.md`, skill descriptions. Cut whole lines (intros, restatements, defaults an agent
   follows anyway), not grammar. Keep one line of why; it's how an agent handles the case a rule
   didn't name. Detail for one kind of task goes in a topic doc, with a pointer in the map.
2. **One home per fact**; link to it everywhere else. The code is a home too: name the file rather
   than copying its lists, options or UI copy.
3. **A doc is sized to be read whole.** The map routes at file granularity, so a doc sessions only
   ever need part of is really two docs — or a folder with an index `README.md`, the shape
   `docs/decisions/` has. Grab-bags (conventions, integrations) hit this first; a doc genuinely
   read end to end stays one file.
4. **Replace, don't append.** Every session adds and none removes, so when behavior changes,
   rewrite the paragraph and delete what's no longer true.
5. **Rule, why, pointer.** Investigation stories, measurements, logs and false trails go in the
   issue or commit message. The doc gets the rule, one line of why and the issue number; keep a
   figure only if someone needs it to act. The project's docs check holds each doc to a size
   budget; one over budget gets the `tidy-docs` pass before anything new goes in. A budget is a
   prompt to look for stories and duplicates, never a reason to cut a rule or the reasoning that
   makes it usable. When a tidy pass leaves a doc smaller, lower its budget to the new size plus
   ~5%: budgets ratchet down, they don't just hold the line.
6. **Decisions go in the decision log** (see the map): the why, not the diff, written so someone
   who wasn't there can follow it. When one reverses an older entry, mark the older one, or a
   search finds the stale answer first.
7. **Procedures become scripts or skills.** A broken script fails loudly; a wrong paragraph gets
   believed.
8. **Anything with an open/closed lifecycle is a GitHub issue**, never a doc: to-dos, open
   questions, "still needs verifying".

**Before finishing:** did this make a doc untrue, or turn up something a doc should have said? Fix
it in the same change, and keep the map current.

**When something goes wrong** (a broken build, a wrong assumption, a correction): fix the cause,
then make the missing rule stick. Put it in code if you can (a test, a lint rule, a script);
otherwise sharpen the doc rule that should have caught it rather than adding one beside it.

## Map

- `docs/decisions/`: why the project is the way it is, before changing it
- `.agents/skills/ingest-labs/`: adding lab results from a PDF or other source
- `src/app/(owner)/manage/` (forms), `src/actions/` and `src/ingest/edits.ts` (their writes):
  editing data in the app
- `src/lib/auth.ts`, `src/proxy.ts` and `src/sharing/`: sign-in and doctor share links
- `src/export/`: the CSV and PDF downloads (routes under `export/[format]/`)

## Non-negotiables

- **No personal health data in git or on GitHub.** The repo is public. `data/` (source PDFs) and
  `imports/` (staging files) stay gitignored; `src/db/seed/` holds biomarker definitions only.
  Branch names, commit messages, code comments, PRs and issues describe the code change, never
  Andy's results: no draw dates, values, tests he took or which lab/report prompted it.
- **Results enter the database only through `applyImport`** (`npm run ingest`, or the app's
  forms via `src/ingest/edits.ts`). Name matching, unit conversion, dedupe and source precedence
  live there; hand-written SQL skips all of it.
- **Every data loader and Server Action checks access first**: `requireOwner()`
  (`src/lib/auth.ts`) or a live share token (`loadSharedDashboard`). The proxy's redirect to
  `/login` is a convenience, not the gate; a layout can't be the gate either.
- **Never cache health data into the build** (`"use cache"`, static params). Read it at request
  time inside `<Suspense>`; it's personal, and later shared by link.
- **Schema changes go through Drizzle:** edit `src/db/schema.ts`, then `npm run db:generate` and
  `npm run db:migrate`. The `supabase` skill's CLI migration workflow doesn't apply here; its
  security checklist does.
- **Deploys don't migrate.** Merging to `main` deploys to Vercel at once, so a PR with a migration
  needs it applied to Supabase first (with Andy's OK), or production breaks.
- **Write descriptions fresh.** Don't copy Function Health's or any lab's text; it's theirs.

## UI copy

- **Sentence case everywhere**: headings, buttons, labels, menu items, status names ("Out of
  range"), category names ("Immune regulation"), export headers. Only proper nouns keep capitals:
  lab and brand names (Function Health) and biomarker names, which follow the labs' own naming.
  It's Andy's house style. The seed never renames existing rows, so a catalog rename also needs
  the live row updated (with Andy's OK).
- **Status labels have one home**, `STATUS_LABEL` in `src/lib/status.ts`; use it, don't retype them.

## Ground rules

- **Hold the scope.** Flag adjacent problems with an offer to fix them now or open an issue; don't
  fix them silently. No abstractions nothing needs yet.
- **No new dependencies without asking.**
- **Flag changes needed outside the repo** (host env vars, CMS or dashboard settings, DNS,
  third-party accounts): exactly what and where, so nothing half-ships.
- **Ask before writing to live data or production**: migrations, imports, deletes, a schema change
  that strands data, deploys. Dry runs and reads are fine.
- **Secrets never go in the repo.** Keep them in the keychain, a password manager or a gitignored
  env file, and name where each one comes from (`.env.example`, or the header of the script that
  uses it). A key meant to ship in the client (a public SDK key) isn't a secret.
- **Reuse the existing path.** If what you're about to write sounds like something the project
  already does, find it and call it; a second copy is a bug even while both work. Found two? Flag
  it.
- **A comment that claims a relationship** ("matches X") **is a claim to check** against the code.
  Prefer code that enforces it.
- **Fixed a class of bug? Sweep for its siblings.**
- **Made something testable? Write the test** in the same task.

## Issue tracking

GitHub Issues holds everything with an open/closed lifecycle: bugs, follow-ups, ideas, fixes
awaiting a human check. No in-repo to-do lists.

- **Check the backlog** when planning, and before changing a file:
  `gh issue list --search "<file or feature>"`.
- **Never open an issue unprompted.** For later work (out of scope, blocked, or the user's call),
  offer in one line and open it only on a yes; if it's small, offer to do it now instead. The
  tracker stays short enough that everything in it gets done.
- **Declined?** Mention it in the summary or PR description and drop it. No doc, `TODO` or status
  file.
- **Write issues for someone who wasn't here**: what's wrong, repo-relative file paths (so search
  finds them), what unblocks it.
- **Existing issues need no asking**: comment, label, close. Close what you fixed in the same task,
  and reference it (`Closes #12`).
- **Only a person can confirm it** (a real device, production, a dashboard)? Keep or offer a
  `needs-verification` issue with exact steps, if it would still need checking in a week by someone
  who wasn't here. Not for a visual change the user asked for in this thread.
- **Closing an issue? Keep the lesson**: the issue holds the story, the doc gets the rule.
- **No `gh`?** Say so; don't treat the backlog as empty.

## Before you finish

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run docs:check` (doc
size budgets and broken doc paths; the budgets live in `scripts/docs-check.ts`). Other scripts are
in `package.json`.

## Where things are

- `src/db/schema.ts`: tables; `src/db/seed/catalog.ts`: categories and biomarker definitions
- `src/lib/`: status, value parsing and units (pure, tested); `src/ingest/`: plan/apply scripts
- `src/app/(owner)/` is the signed-in owner's site, `src/app/s/[token]/` a share link's copy of
  it; both render `src/components/views/` with a different `basePath`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
