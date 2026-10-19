# One owner signs in by email link; doctors get unguessable share links

**Status:** Current

**Context.** Phase 3 puts the app on the internet so a doctor can see the results. Until then
nothing had a login: the app ran locally and editing only worked under `next dev`.

**Decision.**
- **The owner** signs in with a Supabase magic link. Only `OWNER_EMAIL` may see or change data.
  Sign-ups are turned off in Supabase, and the app asks Supabase for a link only for that address
  (`shouldCreateUser: false`).
- **The email leads with a one-time code**, because the link only works in the browser that asked
  for it (PKCE) and the code works in any. Supabase sends it through Resend's SMTP (Supabase →
  Authentication → Emails → SMTP Settings); its built-in sender is slow, capped at 2 an hour and
  can't use a custom template. The Magic Link template there must include `{{ .Token }}` (the
  code) and `{{ .ConfirmationURL }}` (the link). (#3)
- **Access is checked where data is touched.** Every loader in `src/lib/data.ts` and every
  Server Action calls `requireOwner()`, which verifies the session with `getClaims()`. The proxy
  (`src/proxy.ts`) refreshes the session and redirects signed-out visitors, but it only checks that
  *someone* is signed in.
- **Local development can skip sign-in** with `DEV_SKIP_SIGN_IN=true` (`signInSkipped` in
  `src/lib/owner.ts`). It only works under `next dev`, so a production build ignores it, and
  `npm run dev` listens on localhost only, so nobody else on the network can reach a skipped
  sign-in.
- **A doctor** gets `/s/<token>`: 32 random bytes. Links are looked up by the token's SHA-256
  hash, and the token is stored too so the owner can copy a link again. A link shows everything,
  read-only, until its expiry date or until it's revoked. The owner picks the expiry when
  creating it, and can pick "Never" (`expires_at` is then empty). The
  share pages send `Referrer-Policy: no-referrer`, `noindex` and `no-store`. Opening the front
  page updates "last opened" and the open count; inner pages don't count, so prefetches don't
  inflate it.
- **Data still goes through Drizzle** on the server. Supabase is used for sign-in only, so its
  Data API is turned off and the public API key has no route to the tables. The tables also keep
  row-level security with no policies, as a second lock (`src/db/schema.test.ts` checks it).

**Why.** A magic link means no password to leak or reuse, and it's Supabase's standard flow.
Checking in each loader follows Next.js's guidance, because layouts and the proxy don't run for
every request in a way that can be trusted as a gate. An unguessable bearer token is the usual
pattern for share links. Storing it only as a hash was tried first and dropped: the database
already holds everything a link reveals, so a leak exposes the data either way, while being able
to copy a link again is useful. Expiry and revocation are the real limits. "Never" was added for
a doctor who stays on the case for years, where re-sending a link every year is busywork; such a
link relies on revocation alone, and the Sharing page's last-opened date and open count are how
the owner notices a link being used after it should have stopped.
Rejected:
- a passcode on top of the link (more friction for the doctor; it may be revisited)
- per-link category limits (more to build and test than the need justified)
- Supabase's data API with row-level security policies (a second access model alongside Drizzle)

**Revisit if.** Links need to be narrower (by category or date), or need to stop working after a
forward. Then add a passcode or per-link scope to `share_links`.
