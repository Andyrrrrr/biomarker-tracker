"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// A form select over a short fixed list. The chosen value is submitted under `name`.
export function Choice({
  name,
  items,
  defaultValue,
  onValueChange,
  id,
  className,
  "aria-label": ariaLabel,
}: {
  name: string;
  items: { value: string; label: string }[];
  defaultValue: string;
  onValueChange?: (value: string) => void;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Select
      name={name}
      items={items}
      defaultValue={defaultValue}
      onValueChange={(v) => onValueChange?.(v as string)}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn("w-full", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
