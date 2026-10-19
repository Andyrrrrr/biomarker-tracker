# Biomarker Tracker

A personal dashboard for a lifetime of bloodwork: every lab result in one place, grouped by body
system, with a trend line per biomarker. Results come in through an agent skill that reads lab
PDFs, matches them to known biomarkers and skips duplicates.

## Setup

1. Create a Supabase project. Copy `.env.example` to `.env.local` and fill it in.
2. In Supabase → Authentication: add yourself under **Users** (Add user → Create new user, with
   your `OWNER_EMAIL`), turn off **Allow new users to sign up**, and under **URL Configuration**
   add `http://localhost:3000/auth/callback` (and your deployed URL's `/auth/callback`) to the
   redirect URLs. Then turn off the **Data API** (Integrations → Data API → Settings): the app
   reads data through `DATABASE_URL`, and sign-in doesn't need it.
3. `npm install`
4. `npm run db:migrate`: create the tables.
5. `npm run db:seed`: add the starting categories and biomarkers (`src/db/seed/catalog.ts`).
   Safe to re-run; it only adds what's missing.
6. `npm run dev`, open http://localhost:3000 and sign in with the emailed link. To skip sign-in
   while developing, add `DEV_SKIP_SIGN_IN=true` to `.env.local`; it only works under `npm run dev`,
   which listens on this computer only.

## Deploying

Vercel deploys `main` on every merge, and each PR gets a preview. On Vercel, set the variables
from `.env.example`, with `DATABASE_URL` on Supabase's transaction pooler (port 6543), and add
the site's `/auth/callback` to Supabase's redirect URLs. Deploys don't run migrations: apply them
with `npm run db:migrate` before merging a PR that has one.

## Sharing with a doctor

Manage → Sharing creates a read-only link to everything, with an expiry you pick, or "Never" for
a link that works until you revoke it. Copy it from the list any time it's active, and revoke it
there when it's no longer needed.

## Adding results

Ask a coding agent to ingest a report; it follows `.agents/skills/ingest-labs/SKILL.md`. By hand:

```sh
npm run ingest -- plan imports/<file>.json    # preview: new, duplicate, conflicts, unmatched
npm run ingest -- apply imports/<file>.json   # write
npm run ingest -- reports                     # what's stored
```

To type in a report, fix a result or edit a biomarker, sign in and use **Manage** (top right).

Source PDFs go in `data/` and staging files in `imports/`. Both are gitignored: no personal
health data belongs in the repo.

## Checks

`npm run lint`, `npm run typecheck`, `npm test` (uses an in-memory Postgres; no database needed),
`npm run build`.

## License and security

MIT ([`LICENSE`](LICENSE)). To report a vulnerability, and for the security model, see
[`SECURITY.md`](SECURITY.md).
