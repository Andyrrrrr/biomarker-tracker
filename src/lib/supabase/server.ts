import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase is only used for signing in; data is read with Drizzle (src/db). Both values are
// public by design (the publishable key ships to browsers); .env.example says where they come from.
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set (see .env.example).",
    );
  }
  return { url, key };
}

// A client bound to this request's cookies. Make a new one per request.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies. The proxy (src/proxy.ts) refreshes sessions, so
          // a refresh skipped here is picked up on the next request.
        }
      },
    },
  });
}
