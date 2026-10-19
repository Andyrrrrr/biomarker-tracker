"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { FormState } from "@/lib/forms";

// Submits a form to a Server Action and keeps what it returns. It submits from onSubmit rather
// than <form action>, because React resets a form after an action prop runs and a validation
// error would wipe what was typed. `onDone` runs when the action reports success.
export function useFormAction(action: (formData: FormData) => Promise<FormState>, onDone?: () => void) {
  const [state, setState] = useState<FormState>();
  const [pending, startTransition] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const next = await action(formData);
      setState(next);
      if (next?.ok) onDone?.();
    });
  };
  return { state, pending, onSubmit, error: (field: string) => state?.fields?.[field] };
}
