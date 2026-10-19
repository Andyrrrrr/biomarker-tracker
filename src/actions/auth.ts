"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/forms";
import { isOwnerEmail } from "@/lib/owner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const email = z.string().trim().email("Enter an email address.");

// Emails a one-time sign-in code and link, but only to the owner. Anyone else gets the same reply
// and no email, so the form doesn't reveal whose address works.
export async function sendSignInEmail(formData: FormData): Promise<FormState> {
  const parsed = email.safeParse(formData.get("email") ?? "");
  if (!parsed.success) return { message: parsed.error.issues[0].message, fields: { email: parsed.error.issues[0].message } };

  if (isOwnerEmail(parsed.data, process.env.OWNER_EMAIL)) {
    // Supabase only redirects to URLs on its allow list (Authentication → URL Configuration).
    const origin = (await headers()).get("origin");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) return { message: `Couldn't send the email: ${error.message}` };
  }
  return {
    ok: true,
    message: "Check your email for a code. You can also open its link, but only in this browser.",
  };
}

const code = z
  .string()
  .transform((v) => v.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6,10}$/, "Enter the code from the email."));

// Signs in with the code from the email. Unlike the link, it works in any browser.
export async function verifySignInCode(formData: FormData): Promise<FormState> {
  const parsedEmail = email.safeParse(formData.get("email") ?? "");
  const parsedCode = code.safeParse(formData.get("code") ?? "");
  if (!parsedCode.success) return { message: parsedCode.error.issues[0].message, fields: { code: parsedCode.error.issues[0].message } };
  const refused = { message: "That code didn't work. It may have expired, or a newer one was sent.", fields: { code: "Invalid code" } };
  if (!parsedEmail.success || !isOwnerEmail(parsedEmail.data, process.env.OWNER_EMAIL)) return refused;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email: parsedEmail.data, token: parsedCode.data, type: "email" });
  if (error) return refused;
  redirect("/");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
