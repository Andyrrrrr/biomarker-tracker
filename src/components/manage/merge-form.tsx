"use client";

import { useState } from "react";
import { mergeBiomarkerAction } from "@/actions/manage";
import { FieldDescription } from "@/components/ui/field";
import type { BiomarkerOption } from "@/lib/data";
import { BiomarkerPicker } from "./biomarker-picker";
import { ConfirmButton } from "./confirm-button";

// Merge this biomarker into another of the same kind; this one is then deleted.
export function MergeForm({
  from,
  options,
  results,
  aliases,
}: {
  from: { slug: string; name: string };
  options: BiomarkerOption[];
  results: number;
  aliases: number;
}) {
  const [into, setInto] = useState<BiomarkerOption | null>(null);
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <FieldDescription>
        For a duplicate: moves this biomarker&apos;s {plural(results, "result")} and {plural(aliases, "alias", "aliases")} into
        another, makes its names aliases there, then deletes it. Results the other one already has from the same report
        are skipped.
      </FieldDescription>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-sm">
          <BiomarkerPicker name="into" options={options} value={into} onChange={setInto} aria-label="Merge into" />
        </div>
        <ConfirmButton
          disabled={!into}
          title={`Merge into ${into?.name}?`}
          description={`${from.name} will be deleted after its results and aliases move to ${into?.name}. This can't be undone.`}
          confirm="Merge"
          action={() => mergeBiomarkerAction(from.slug, into!.slug)}
        >
          Merge…
        </ConfirmButton>
      </div>
    </div>
  );
}
