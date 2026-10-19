import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { isOwnerEmail, signInSkipped } from "./owner";
import { createSupabaseServerClient } from "./supabase/server";

// The signed-in owner's email, or null. getClaims() verifies the session token's signature, so
// unlike getSession() it can be trusted on the server. Memoized per request.
export const getOwner = cache(async (): Promise<string | null> => {
  // Request time only. Cookies alone can resolve during a prefetch, and getClaims() reads the
  // clock to check expiry, which Next.js refuses to prerender ("blocking-prerender-current-time").
  await connection();
  if (signInSkipped()) return process.env.OWNER_EMAIL!;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  return isOwnerEmail(email, process.env.OWNER_EMAIL) ? (email as string) : null;
});

// The real access check for the owner's pages and every Server Action that writes. The proxy's
// redirect to /login is only a convenience; this is what keeps data private.
export async function requireOwner(): Promise<string> {
  const owner = await getOwner();
  if (!owner) redirect("/login");
  return owner;
}
