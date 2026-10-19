"use client";

import Link from "next/link";
import { addReportAction } from "@/actions/manage";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import type { BiomarkerOption } from "@/lib/data";
import { FormFooter } from "./form-footer";
import { ReportFields } from "./report-fields";
import { ResultRows } from "./result-rows";
import { useFormAction } from "./use-form-action";

// A report typed in by hand.
export function ManualReportForm({ options }: { options: BiomarkerOption[] }) {
  const { state, pending, onSubmit, error } = useFormAction(addReportAction);
  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <div className="flex max-w-2xl flex-col gap-8">
          <ReportFields error={error} />
        </div>
        <ResultRows options={options} error={error} />
      </FieldGroup>
      <FormFooter state={state} pending={pending} label="Save report">
        <Button variant="ghost" nativeButton={false} render={<Link href="/manage/reports" />}>
          Cancel
        </Button>
      </FormFooter>
    </form>
  );
}
