"use client";

import { useState } from "react";
import { sendSignInEmail, verifySignInCode } from "@/actions/auth";
import { useFormAction } from "@/components/manage/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";

// Two steps: send the email, then enter its code (or click its link). The code comes from
// Supabase's Magic Link email template ({{ .Token }}); see the sign-in decision in docs/decisions/.
export function LoginForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const send = useFormAction(async (formData) => {
    const result = await sendSignInEmail(formData);
    if (result?.ok) setSentTo(String(formData.get("email")));
    return result;
  });
  const verify = useFormAction(verifySignInCode);

  if (sentTo === null) {
    return (
      <form onSubmit={send.onSubmit} className="flex flex-col gap-3 pt-6" noValidate>
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(send.error("email"))} />
        <Button type="submit" disabled={send.pending}>
          {send.pending ? "Sending…" : "Email me a code"}
        </Button>
        <Message state={send.state} />
      </form>
    );
  }

  return (
    <form onSubmit={verify.onSubmit} className="flex flex-col gap-3 pt-6" noValidate>
      <Message state={send.state} />
      <input type="hidden" name="email" value={sentTo} />
      <label htmlFor="code" className="text-sm font-medium">
        Code
      </label>
      <Input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        required
        className="font-mono tracking-widest"
        aria-invalid={Boolean(verify.error("code"))}
      />
      <Button type="submit" disabled={verify.pending}>
        {verify.pending ? "Checking…" : "Sign in"}
      </Button>
      <Message state={verify.state} />
      <button type="button" onClick={() => setSentTo(null)} className="cursor-pointer self-start text-sm text-muted-foreground underline-offset-4 hover:underline">
        Use a different email
      </button>
    </form>
  );
}

function Message({ state }: { state: FormState }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
      {state.message}
    </p>
  );
}
