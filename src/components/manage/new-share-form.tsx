"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { createShareLinkAction, type NewShareState } from "@/actions/sharing";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SHARE_DURATIONS } from "@/sharing/durations";
import { Choice } from "./choice";

const DURATIONS = SHARE_DURATIONS.map((d) => ({ value: d.value, label: d.label }));

export function NewShareForm() {
  const [state, setState] = useState<NewShareState>();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const next = await createShareLinkAction(formData);
      setState(next);
      setCopied(false);
      if (next?.ok) form.reset();
    });
  };

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end" noValidate>
        <Field data-invalid={!!state?.fields?.label}>
          <FieldLabel htmlFor="share-label">Who it&apos;s for</FieldLabel>
          <Input id="share-label" name="label" placeholder="Dr. Lee, annual physical" maxLength={100} aria-invalid={!!state?.fields?.label} required />
          <FieldError>{state?.fields?.label}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="share-expires">Expires after</FieldLabel>
          <Choice id="share-expires" name="expires" items={DURATIONS} defaultValue="30" />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create link"}
        </Button>
      </form>

      {state?.url && (
        <div role="status" className="rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-medium">Link created. You can copy it again from the list below.</p>
          <div className="flex gap-2 pt-3">
            <Input readOnly value={state.url} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={() => copy(state.url!)}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
      {state && !state.ok && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </div>
  );
}
