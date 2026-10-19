import { Button } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

// The submit button with the action's message beside it. On a page it's a band stuck to the
// bottom of the window, so Save stays in reach on a long form; it settles back into place at
// the form's end. Put it directly inside <form> (not a narrower wrapper) so the band spans the
// content column. Dialogs pass band={false}: they're short and have their own footer.
export function FormFooter({
  state,
  pending,
  label,
  band = true,
  children,
}: {
  state: FormState;
  pending: boolean;
  label: string;
  band?: boolean;
  children?: React.ReactNode;
}) {
  const controls = (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      {children}
      {state?.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={cn("text-sm", state.ok ? "text-muted-foreground" : "text-destructive")}
        >
          {state.message}
        </p>
      )}
    </div>
  );
  if (!band) return controls;
  // mt-8 matches FieldGroup's gap, the space it had when it sat inside the group.
  return <div className="sticky bottom-0 z-10 mt-8 border-t bg-background py-3">{controls}</div>;
}
