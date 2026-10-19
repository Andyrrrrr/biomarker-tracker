// The app has one owner: the person whose email is OWNER_EMAIL. Signing in with Supabase proves an
// email address; this decides whether that address may see and edit the data.
export function isOwnerEmail(email: unknown, ownerEmail: string | undefined): boolean {
  if (!ownerEmail || typeof email !== "string") return false;
  return email.trim().toLowerCase() === ownerEmail.trim().toLowerCase();
}

// Local convenience: with DEV_SKIP_SIGN_IN=true, `next dev` treats you as signed in as the owner.
// Ignored in every other mode, so a production build can't be opened up by setting it.
export function signInSkipped(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "development" && env.DEV_SKIP_SIGN_IN === "true" && Boolean(env.OWNER_EMAIL);
}
