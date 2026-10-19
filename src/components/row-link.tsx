import Link from "next/link";
import { cn } from "@/lib/utils";

// Makes a whole table row clickable: the link's hit area stretches over the row, which must
// have ROW_LINK_ROW. One real link per row keeps it a single tab stop for keyboards and readers.
// Only these rows get a hover color (TableRow has none), so hover always means "clickable".
export const ROW_LINK_ROW = "group/row relative cursor-pointer hover:bg-muted/50";

export function RowLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "outline-none group-hover/row:underline after:absolute after:inset-0 focus-visible:after:rounded-sm focus-visible:after:ring-2 focus-visible:after:ring-ring",
        className,
      )}
    >
      {children}
    </Link>
  );
}
