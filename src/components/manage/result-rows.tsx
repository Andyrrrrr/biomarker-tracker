"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { BiomarkerOption } from "@/lib/data";
import { BiomarkerPicker } from "./biomarker-picker";

type Row = { key: number; biomarker: BiomarkerOption | null };

// Rows of typed results, submitted as results.0.value, results.1.value… Values are entered as
// printed ("<0.2", "Negative"); the import parses and converts them, and refuses what it can't.
export function ResultRows({
  options,
  error,
  legend = "Results",
}: {
  options: BiomarkerOption[];
  error: (field: string) => string | undefined;
  legend?: string;
}) {
  const [rows, setRows] = useState<Row[]>([{ key: 0, biomarker: null }]);
  const [nextKey, setNextKey] = useState(1);
  const setBiomarker = (key: number, biomarker: BiomarkerOption | null) =>
    setRows(rows.map((r) => (r.key === key ? { ...r, biomarker } : r)));

  return (
    <FieldSet>
      <FieldLegend>{legend}</FieldLegend>
      <FieldError>{error("results")}</FieldError>
      <ol className="flex flex-col divide-y border-y">
        {rows.map((row, i) => {
          const f = (field: string) => `results.${i}.${field}`;
          const qualitative = row.biomarker?.resultType === "qualitative";
          return (
            <li key={row.key} className="flex gap-2 py-4">
              <span className="w-6 shrink-0 pt-7 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="grid flex-1 gap-3 sm:grid-cols-6">
                <Field data-invalid={!!error(f("biomarker"))} className="sm:col-span-3">
                  <FieldLabel htmlFor={f("biomarker")}>Biomarker</FieldLabel>
                  <BiomarkerPicker
                    id={f("biomarker")}
                    name={f("biomarker")}
                    options={options}
                    value={row.biomarker}
                    onChange={(b) => setBiomarker(row.key, b)}
                    invalid={!!error(f("biomarker"))}
                  />
                  <FieldError>{error(f("biomarker"))}</FieldError>
                </Field>
                <Field data-invalid={!!error(f("value"))} className="sm:col-span-2">
                  <FieldLabel htmlFor={f("value")}>Value</FieldLabel>
                  <Input
                    id={f("value")}
                    name={f("value")}
                    placeholder={qualitative ? "Negative" : "<0.2"}
                    aria-invalid={!!error(f("value"))}
                  />
                  <FieldError>{error(f("value"))}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor={f("unit")}>Unit</FieldLabel>
                  {/* Keyed on the biomarker so picking one fills in its unit. */}
                  <Input
                    key={row.biomarker?.slug}
                    id={f("unit")}
                    name={f("unit")}
                    defaultValue={row.biomarker?.unit ?? ""}
                    disabled={qualitative}
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={f("range")}>Lab range</FieldLabel>
                  <Input id={f("range")} name={f("range")} placeholder="65-99" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={f("flag")}>Flag</FieldLabel>
                  <Input id={f("flag")} name={f("flag")} placeholder="H" />
                </Field>
                <Field className="sm:col-span-3">
                  <FieldLabel htmlFor={f("notes")}>Notes</FieldLabel>
                  <Input id={f("notes")} name={f("notes")} />
                </Field>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-6"
                aria-label={`Remove row ${i + 1}`}
                disabled={rows.length === 1}
                onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
              >
                <X />
              </Button>
            </li>
          );
        })}
      </ol>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setRows([...rows, { key: nextKey, biomarker: null }]);
            setNextKey(nextKey + 1);
          }}
        >
          <Plus /> Add result
        </Button>
      </div>
    </FieldSet>
  );
}
