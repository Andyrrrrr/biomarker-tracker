"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { addResultsAction } from "@/actions/manage";
import { Button } from "@/components/ui/button";
import type { BiomarkerOption } from "@/lib/data";
import { FormFooter } from "./form-footer";
import { ResultRows } from "./result-rows";
import { useFormAction } from "./use-form-action";

// Adds typed results to a stored report. Closed until asked for; closes again once saved, so the
// next time it opens with one empty row.
export function AddResultsForm({ reportId, options }: { reportId: number; options: BiomarkerOption[] }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus /> Add results
      </Button>
    );
  }
  return <OpenForm reportId={reportId} options={options} onClose={() => setOpen(false)} />;
}

function OpenForm({ reportId, options, onClose }: { reportId: number; options: BiomarkerOption[]; onClose: () => void }) {
  const { state, pending, onSubmit, error } = useFormAction(addResultsAction.bind(null, reportId), onClose);
  return (
    <form onSubmit={onSubmit} noValidate>
      <ResultRows options={options} error={error} legend="Add results" />
      <FormFooter state={state} pending={pending} label="Add to report">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </FormFooter>
    </form>
  );
}
