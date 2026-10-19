"use client";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Report } from "@/db/schema";
import { Choice } from "./choice";
import { DatePicker } from "./date-picker";

const FASTING = [
  { value: "unknown", label: "Not recorded" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

// A report's own details, shared by the new-report and edit-report forms.
export function ReportFields({
  report,
  error,
}: {
  report?: Pick<Report, "collectedOn" | "collectedTime" | "lab" | "fasting" | "notes">;
  error: (field: string) => string | undefined;
}) {
  const fasting = report?.fasting === true ? "yes" : report?.fasting === false ? "no" : "unknown";
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field data-invalid={!!error("collectedOn")}>
          <FieldLabel htmlFor="collectedOn">Collected on</FieldLabel>
          <DatePicker id="collectedOn" name="collectedOn" defaultValue={report?.collectedOn} aria-invalid={!!error("collectedOn")} />
          <FieldError>{error("collectedOn")}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="collectedTime">Time</FieldLabel>
          {/* Typed, not picked: the browser's time popup can't be styled, so its button is hidden. */}
          <Input
            id="collectedTime"
            name="collectedTime"
            type="time"
            defaultValue={report?.collectedTime ?? ""}
            className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="fasting">Fasting</FieldLabel>
          <Choice id="fasting" name="fasting" items={FASTING} defaultValue={fasting} />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="lab">Lab</FieldLabel>
        <Input id="lab" name="lab" defaultValue={report?.lab ?? ""} className="max-w-sm" />
      </Field>
      <Field>
        <FieldLabel htmlFor="notes">Notes</FieldLabel>
        <Textarea id="notes" name="notes" defaultValue={report?.notes ?? ""} rows={2} />
      </Field>
    </>
  );
}
