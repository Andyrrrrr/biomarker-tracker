"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { editResultAction } from "@/actions/manage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Result } from "@/db/schema";
import { FormFooter } from "./form-footer";
import { useFormAction } from "./use-form-action";

type Editable = Pick<
  Result,
  "id" | "reportedValue" | "reportedUnit" | "labRangeText" | "labFlag" | "isCalculated" | "notes"
>;

// Edit one result's as-printed fields. Saving re-imports it, so the value is parsed and converted
// again and the same checks apply.
export function ResultDialog({ result, biomarkerName }: { result: Editable; biomarkerName: string }) {
  const [open, setOpen] = useState(false);
  const { state, pending, onSubmit, error } = useFormAction(editResultAction.bind(null, result.id), () =>
    setOpen(false),
  );
  const id = (field: string) => `result-${result.id}-${field}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Edit ${biomarkerName}`} />}>
        <Pencil />
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{biomarkerName}</DialogTitle>
            <DialogDescription>As printed on the report. The unit is converted on save.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!error("value")}>
                <FieldLabel htmlFor={id("value")}>Value</FieldLabel>
                <Input id={id("value")} name="value" defaultValue={result.reportedValue} aria-invalid={!!error("value")} />
                <FieldError>{error("value")}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor={id("unit")}>Unit</FieldLabel>
                <Input id={id("unit")} name="unit" defaultValue={result.reportedUnit ?? ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor={id("range")}>Lab range</FieldLabel>
                <Input id={id("range")} name="range" defaultValue={result.labRangeText ?? ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor={id("flag")}>Flag</FieldLabel>
                <Input id={id("flag")} name="flag" defaultValue={result.labFlag ?? ""} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={id("notes")}>Notes</FieldLabel>
              <Input id={id("notes")} name="notes" defaultValue={result.notes ?? ""} />
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id={id("calculated")}
                name="calculated"
                defaultChecked={result.isCalculated}
                aria-labelledby={id("calculated-label")}
              />
              <FieldLabel id={id("calculated-label")} htmlFor={id("calculated")} className="font-normal">
                Calculated
              </FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <FormFooter state={state} pending={pending} label="Save" band={false} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
