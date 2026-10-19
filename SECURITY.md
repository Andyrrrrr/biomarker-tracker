# Security

## Reporting a vulnerability

Please report it privately: open this repository's **Security** tab and choose **Report a
vulnerability**. Don't open a public issue, and don't include anyone's real health data in the
report.

## Security model

The app holds one person's lab results, so it has one user and a simple model:

- **One owner.** Only the address in `OWNER_EMAIL` can sign in, with a one-time code (or link)
  emailed by Supabase. Sign-ups are off. Every data loader and Server Action checks the session
  itself (`requireOwner()` in `src/lib/auth.ts`); the redirect to `/login` is a convenience, not
  the gate.
- **Share links work like passwords.** Anyone who has a `/s/<token>` link sees all the data,
  read-only, until the link expires or the owner revokes it. A link set to "Never" expire stops
  only when it's revoked.
- **Data is read only through `DATABASE_URL`**, on the server. Supabase is used for sign-in only:
  its Data API is off and every table has row-level security with no policies, so the public
  Supabase key can't reach the tables.

Why it works this way, and what was rejected:
[`docs/decisions/2026-10-17-share-links-and-owner-sign-in.md`](docs/decisions/2026-10-17-share-links-and-owner-sign-in.md).

## Running your own copy

Follow the setup in the [README](README.md), including turning off sign-ups and the Data API. On
Vercel, give `DATABASE_URL` to the Production environment only, so a pull request's preview build
can't read it.
