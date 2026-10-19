"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { BiomarkerOption } from "@/lib/data";

// A searchable biomarker list. The chosen biomarker's slug is submitted under `name`.
export function BiomarkerPicker({
  name,
  options,
  value,
  onChange,
  id,
  invalid,
  "aria-label": ariaLabel,
}: {
  name: string;
  options: BiomarkerOption[];
  value: BiomarkerOption | null;
  onChange: (value: BiomarkerOption | null) => void;
  id?: string;
  invalid?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Combobox
      name={name}
      items={options}
      value={value}
      onValueChange={onChange}
      itemToStringLabel={(o) => o.name}
      itemToStringValue={(o) => o.slug}
      isItemEqualToValue={(a, b) => a.slug === b.slug}
    >
      <ComboboxInput id={id} placeholder="Search biomarkers" aria-label={ariaLabel} aria-invalid={invalid || undefined} className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>No biomarker found.</ComboboxEmpty>
        <ComboboxList>
          {(o: BiomarkerOption) => (
            <ComboboxItem key={o.slug} value={o}>
              {o.name}
              {o.unit && <span className="text-xs text-muted-foreground">{o.unit}</span>}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
