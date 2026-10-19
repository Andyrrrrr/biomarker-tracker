"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { saveBiomarkerAction } from "@/actions/manage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Biomarker, Category, ReportSource } from "@/db/schema";
import { SOURCE_LABEL } from "@/lib/sources";
import { Choice } from "./choice";
import { FormFooter } from "./form-footer";
import { useFormAction } from "./use-form-action";

type Editable = Pick<
  Biomarker,
  | "slug"
  | "name"
  | "shortName"
  | "description"
  | "resultType"
  | "unit"
  | "rangeLow"
  | "rangeHigh"
  | "optimalEnabled"
  | "optimalLow"
  | "optimalHigh"
  | "normalValues"
> & {
  categories: string[];
  aliases: { alias: string; source: ReportSource | null }[];
  results: number;
};

const KINDS = [
  { value: "numeric", label: "Numeric (a measured value)" },
  { value: "qualitative", label: "Qualitative (text, like Negative)" },
];

const SOURCES = [
  { value: "any", label: "Any source" },
  ...Object.entries(SOURCE_LABEL).map(([value, label]) => ({ value, label: `${label} only` })),
];

const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

// Create (no biomarker) or edit a biomarker. The kind is chosen once, on create. `children`
// render after the fields, above the Save band (the edit page's merge section); they mustn't
// contain a <form>, since forms can't nest.
export function BiomarkerForm({
  biomarker,
  categories,
  children,
}: {
  biomarker?: Editable;
  categories: Category[];
  children?: React.ReactNode;
}) {
  const action = saveBiomarkerAction.bind(null, biomarker?.slug ?? null);
  const { state, pending, onSubmit, error } = useFormAction(action);
  const [kind, setKind] = useState(biomarker?.resultType ?? "numeric");
  const [optimal, setOptimal] = useState(biomarker?.optimalEnabled ?? false);
  // Rows need stable keys so removing one doesn't shift what the others show.
  const [aliases, setAliases] = useState(() =>
    (biomarker?.aliases ?? []).map((a, key) => ({ ...a, key })),
  );
  const [nextKey, setNextKey] = useState(aliases.length);

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="max-w-2xl">
        <Field data-invalid={!!error("name")}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" defaultValue={biomarker?.name} aria-invalid={!!error("name")} required />
          <FieldError>{error("name")}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="shortName">Short name</FieldLabel>
          <Input id="shortName" name="shortName" defaultValue={biomarker?.shortName ?? ""} className="max-w-48" />
          <FieldDescription>An abbreviation, like hs-CRP. Imports match it too.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" name="description" defaultValue={biomarker?.description ?? ""} rows={3} />
        </Field>

        {biomarker ? (
          <input type="hidden" name="resultType" value={kind} />
        ) : (
          <Field>
            <FieldLabel htmlFor="resultType">Kind</FieldLabel>
            <Choice
              id="resultType"
              name="resultType"
              items={KINDS}
              defaultValue={kind}
              onValueChange={(v) => setKind(v as typeof kind)}
              className="max-w-80"
            />
            <FieldDescription>This can&apos;t be changed later.</FieldDescription>
          </Field>
        )}

        {kind === "numeric" ? (
          <>
            <Field data-invalid={!!error("unit")}>
              <FieldLabel htmlFor="unit">Unit</FieldLabel>
              <Input id="unit" name="unit" defaultValue={biomarker?.unit ?? ""} className="max-w-48" aria-invalid={!!error("unit")} />
              <FieldDescription>
                Results in other units are converted on import.
                {biomarker?.results ? " Changing it converts the stored results, so set the range in the new unit too." : ""}
              </FieldDescription>
              <FieldError>{error("unit")}</FieldError>
            </Field>
            <FieldSet>
              <FieldLegend variant="label">Range</FieldLegend>
              <FieldDescription>Status and chart bands use this. Leave an end blank for “under” or “over” only.</FieldDescription>
              <LowHigh name="range" low={biomarker?.rangeLow} high={biomarker?.rangeHigh} error={error} />
            </FieldSet>
            <FieldSet>
              <Field orientation="horizontal">
                {/* Base UI gives the id to a hidden input, so name the visible control too. */}
                <Switch
                  id="optimalEnabled"
                  name="optimalEnabled"
                  checked={optimal}
                  onCheckedChange={setOptimal}
                  aria-labelledby="optimalEnabled-label"
                />
                <FieldLabel id="optimalEnabled-label" htmlFor="optimalEnabled">
                  Optimal band
                </FieldLabel>
              </Field>
              <FieldDescription>A tighter target inside the range. In-range results inside it read “Optimal”.</FieldDescription>
              {/* Hidden rather than removed, so switching it off keeps the numbers for next time. */}
              <div hidden={!optimal}>
                <LowHigh name="optimal" low={biomarker?.optimalLow} high={biomarker?.optimalHigh} error={error} />
              </div>
            </FieldSet>
          </>
        ) : (
          <Field>
            <FieldLabel htmlFor="normalValues">Normal values</FieldLabel>
            <Textarea
              id="normalValues"
              name="normalValues"
              defaultValue={(biomarker?.normalValues ?? []).join("\n")}
              rows={3}
              className="max-w-80"
            />
            <FieldDescription>One per line. Any other result reads “Out of range”; none set reads no status.</FieldDescription>
          </Field>
        )}

        <FieldSet data-invalid={!!error("categories")}>
          <FieldLegend variant="label">Categories</FieldLegend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {categories.map((c) => (
              <Field key={c.slug} orientation="horizontal">
                <Checkbox
                  id={`category-${c.slug}`}
                  name="categories[]"
                  value={c.slug}
                  defaultChecked={biomarker?.categories.includes(c.slug)}
                  aria-labelledby={`category-${c.slug}-label`}
                />
                <FieldLabel id={`category-${c.slug}-label`} htmlFor={`category-${c.slug}`} className="font-normal">
                  {c.name}
                </FieldLabel>
              </Field>
            ))}
          </div>
          <FieldError>{error("categories")}</FieldError>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">Aliases</FieldLegend>
          <FieldDescription>
            Other names labs print for this biomarker. Use a single source when the name means something else elsewhere.
          </FieldDescription>
          {aliases.map((a, i) => (
            <div key={a.key} className="flex items-center gap-2">
              <Input name={`aliases.${i}.alias`} defaultValue={a.alias} aria-label={`Alias ${i + 1}`} />
              <Choice
                name={`aliases.${i}.source`}
                items={SOURCES}
                defaultValue={a.source ?? "any"}
                aria-label={`Alias ${i + 1} source`}
                className="w-48 shrink-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove alias ${i + 1}`}
                onClick={() => setAliases(aliases.filter((x) => x.key !== a.key))}
              >
                <X />
              </Button>
            </div>
          ))}
          <FieldError>{error("aliases")}</FieldError>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAliases([...aliases, { alias: "", source: null, key: nextKey }]);
                setNextKey(nextKey + 1);
              }}
            >
              <Plus /> Add alias
            </Button>
          </div>
        </FieldSet>
      </FieldGroup>
      {children}
      <FormFooter state={state} pending={pending} label={biomarker ? "Save" : "Create biomarker"}>
        <Button variant="ghost" nativeButton={false} render={<Link href="/manage/biomarkers" />}>
          Cancel
        </Button>
      </FormFooter>
    </form>
  );
}

function LowHigh({
  name,
  low,
  high,
  error,
}: {
  name: "range" | "optimal";
  low?: number | null;
  high?: number | null;
  error: (field: string) => string | undefined;
}) {
  const lowName = `${name}Low`;
  const highName = `${name}High`;
  const message = error(lowName) ?? error(highName);
  return (
    <div data-invalid={!!message} className="group/field">
      <div className="flex items-center gap-2">
        <Label htmlFor={lowName} className="sr-only">
          Low
        </Label>
        <Input id={lowName} name={lowName} inputMode="decimal" placeholder="Low" defaultValue={str(low)} className="w-28" aria-invalid={!!error(lowName)} />
        <span aria-hidden className="text-muted-foreground">
          –
        </span>
        <Label htmlFor={highName} className="sr-only">
          High
        </Label>
        <Input id={highName} name={highName} inputMode="decimal" placeholder="High" defaultValue={str(high)} className="w-28" aria-invalid={!!error(highName)} />
      </div>
      <FieldError className="pt-2">{message}</FieldError>
    </div>
  );
}
