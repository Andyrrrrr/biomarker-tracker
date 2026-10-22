"use client";

import { saveCategoryAction } from "@/actions/manage";
import { CategoryIcon } from "@/components/category-icon";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/db/schema";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { FormFooter } from "./form-footer";
import { useFormAction } from "./use-form-action";

// "heart-pulse" → "Heart pulse", the icon's accessible name.
const iconLabel = (name: string) => name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");

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
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICONS.map((icon) => (
              <label key={icon} title={iconLabel(icon)} className="cursor-pointer">
                <input
                  type="radio"
                  name="icon"
                  value={icon}
                  defaultChecked={icon === (category?.icon ?? "activity")}
                  aria-label={iconLabel(icon)}
                  className="peer sr-only"
                />
                <span className="flex size-10 items-center justify-center rounded-md border text-muted-foreground peer-checked:border-foreground peer-checked:bg-muted peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring hover:text-foreground">
                  <CategoryIcon icon={icon} className="size-5" />
                </span>
              </label>
            ))}
          </div>
          <FieldError>{error("icon")}</FieldError>
        </FieldSet>
        {children}
      </FieldGroup>
      <FormFooter state={state} pending={pending} label={category ? "Save" : "Add category"} />
    </form>
  );
}
