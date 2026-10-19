import { cn } from "@/lib/utils";
import { STATUS_LABEL, type Status } from "@/lib/status";

// CSS colors per status; tokens live in src/app/globals.css.
export const STATUS_COLOR: Record<Status, string> = {
  below: "var(--status-out)",
  above: "var(--status-out)",
  abnormal: "var(--status-out)",
  in_range: "var(--status-in)",
  normal: "var(--status-in)",
  optimal: "var(--status-optimal)",
  other: "var(--status-other)",
};

export function StatusLabel({ status, className }: { status: Status; className?: string }) {
  const label = STATUS_LABEL[status];
  if (!label) return null;
  return (
    <span className={cn("font-medium", className)} style={{ color: STATUS_COLOR[status] }}>
      {label}
    </span>
  );
}

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: STATUS_COLOR[status] }}
    />
  );
}
