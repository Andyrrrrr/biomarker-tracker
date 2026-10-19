"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/manage/biomarkers", label: "Biomarkers" },
  { href: "/manage/reports", label: "Reports" },
  { href: "/manage/sharing", label: "Sharing" },
];

// The path is only known at request time, so this renders inside <Suspense> with
// <ManageTabs active={null} /> as the fallback.
export function ManageNav() {
  const pathname = usePathname();
  return <ManageTabs active={TABS.find((t) => pathname.startsWith(t.href))?.href ?? null} />;
}

export function ManageTabs({ active }: { active: string | null }) {
  return (
    <nav aria-label="Manage" className="flex gap-4 border-b pt-4 text-sm">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 pb-2",
            tab.href === active
              ? "border-foreground font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
