"use client";

// A timestamp in the viewer's own time zone. The server renders in its zone (UTC on Vercel), so
// the text can differ after hydration; that's expected, hence suppressHydrationWarning.
const FORMATS = {
  date: { month: "short", day: "numeric", year: "numeric" },
  dateTime: { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
} as const;

export function LocalTime({ value, format = "date" }: { value: Date; format?: keyof typeof FORMATS }) {
  return (
    <time dateTime={value.toISOString()} suppressHydrationWarning>
      {new Intl.DateTimeFormat("en-US", FORMATS[format]).format(value)}
    </time>
  );
}
