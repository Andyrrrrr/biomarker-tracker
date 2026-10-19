import { Activity } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

// The logo tile marks the name as the way home, the usual place to look for it.
export function SiteHeader({ home = "/", children }: { home?: string; children?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
      <Link
        href={home}
        className="-ml-1 flex items-center gap-2 rounded-lg p-1 pr-2 text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span aria-hidden className="flex size-7 items-center justify-center rounded-md border border-foreground/25">
          <Activity className="size-4" />
        </span>
        Biomarkers
      </Link>
      <div className="flex items-center gap-1">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}

export function SiteMain({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">{children}</main>;
}
