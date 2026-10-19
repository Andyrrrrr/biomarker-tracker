"use client";

import { updateReportAction } from "@/actions/manage";
import { FieldGroup } from "@/components/ui/field";
import type { Report } from "@/db/schema";
import { FormFooter } from "./form-footer";
import { ReportFields } from "./report-fields";
import { useFormAction } from "./use-form-action";

export function ReportForm({ report }: { report: Report }) {
  const { state, pending, onSubmit, error } = useFormAction(updateReportAction.bind(null, report.id));
  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="max-w-2xl">
        <ReportFields report={report} error={error} />
      </FieldGroup>
      <FormFooter state={state} pending={pending} label="Save details" />
    </form>
  );
}
