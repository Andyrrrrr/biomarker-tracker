"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

// A button that asks first, then runs a destructive Server Action. A refusal shows in the dialog.
export function ConfirmButton({
  action,
  title,
  description,
  confirm,
  children,
  variant = "destructive",
  size,
  disabled,
  "aria-label": ariaLabel,
}: {
  action: () => Promise<FormState>;
  title: string;
  description: React.ReactNode;
  confirm: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const run = () =>
    startTransition(async () => {
      const result = await action();
      if (result?.ok) setOpen(false);
      else setMessage(result?.message);
    });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setMessage(undefined);
      }}
    >
      <AlertDialogTrigger
        render={<Button type="button" variant={variant} size={size} disabled={disabled} aria-label={ariaLabel} />}
      >
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={run} disabled={pending}>
            {pending ? "Working…" : confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
