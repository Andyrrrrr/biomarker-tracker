"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { saveCategoryAction } from "@/actions/manage";
import { CategoryIcon } from "@/components/category-icon";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/db/schema";
import { CATEGORY_ICONS, categoryIconLabel } from "@/lib/category-icons";
import { FormFooter } from "./form-footer";
import { useFormAction } from "./use-form-action";

// Create (no category) or edit a category's name, description and icon. `children` render after
// the fields, above the Save band; they mustn't contain a <form>.
export function CategoryForm({
  category,
  children,
}: {
  category?: Pick<Category, "slug" | "name" | "description" | "icon">;
  children?: React.ReactNode;
}) {
  const action = saveCategoryAction.bind(null, category?.slug ?? null);
  const { state, pending, onSubmit, error } = useFormAction(action);
  const [filter, setFilter] = useState("");
  const query = filter.trim().toLowerCase();
  const shown = (icon: string) => !query || categoryIconLabel(icon).toLowerCase().includes(query);

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="max-w-2xl">
        <Field data-invalid={!!error("name")}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" defaultValue={category?.name} aria-invalid={!!error("name")} required />
          <FieldError>{error("name")}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" name="description" defaultValue={category?.description ?? ""} rows={2} />
        </Field>
        {/* Native radios, drawn as icon tiles: arrow keys move the choice, Tab leaves the group. */}
        <FieldSet data-invalid={!!error("icon")}>
          <FieldLegend variant="label">Icon</FieldLegend>
          {/* No name, so it isn't submitted. Filtered-out icons are hidden, not removed, so the
              chosen one still submits while it's out of view. */}
          <div className="relative max-w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              placeholder="Filter icons"
              aria-label="Filter icons"
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICONS.map((icon) => (
              <label key={icon} title={categoryIconLabel(icon)} hidden={!shown(icon)} className="cursor-pointer">
                <input
                  type="radio"
                  name="icon"
                  value={icon}
                  defaultChecked={icon === (category?.icon ?? "activity")}
                  aria-label={categoryIconLabel(icon)}
                  className="peer sr-only"
                />
                <span className="flex size-10 items-center justify-center rounded-md border text-muted-foreground peer-checked:border-foreground peer-checked:bg-muted peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring hover:text-foreground">
                  <CategoryIcon icon={icon} className="size-5" />
                </span>
              </label>
            ))}
          </div>
          {!CATEGORY_ICONS.some(shown) && <p className="text-sm text-muted-foreground">No icons match.</p>}
          <FieldError>{error("icon")}</FieldError>
        </FieldSet>
        {children}
      </FieldGroup>
      <FormFooter state={state} pending={pending} label={category ? "Save" : "Add category"} />
    </form>
  );
}
