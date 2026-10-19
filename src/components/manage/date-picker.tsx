"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format";

// "2025-08-29" <-> a Date at local midnight, which is what the calendar compares days by.
function toDate(value: string): Date | undefined {
  const [y, m, d] = value.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
}

function toValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// A calendar-day field for forms: a button that opens shadcn's Calendar. The day is submitted
// under `name` as "YYYY-MM-DD", the same as a native date input; the server validates it.
export function DatePicker({
  id,
  name,
  defaultValue = "",
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  "aria-invalid"?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            aria-invalid={ariaInvalid}
            className="w-full justify-between border-input bg-transparent px-2.5 font-normal"
          />
        }
      >
        {selected ? formatDate(value) : <span className="text-muted-foreground">Pick a date</span>}
        <CalendarIcon className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(1990, 0)}
          endMonth={new Date()}
          disabled={{ after: new Date() }}
          onSelect={(date) => {
            if (!date) return;
            setValue(toValue(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
      <input type="hidden" name={name} value={value} />
    </Popover>
  );
}
