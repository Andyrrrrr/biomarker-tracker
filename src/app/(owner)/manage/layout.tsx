import { Suspense } from "react";
import { ManageNav, ManageTabs } from "@/components/manage/manage-nav";

// Everything under /manage edits data. Its loaders and actions check for the owner
// (src/lib/auth.ts), like the rest of the owner's pages.
export default function ManageLayout({ children }: LayoutProps<"/manage">) {
  return (
    <>
      <Suspense fallback={<ManageTabs active={null} />}>
        <ManageNav />
      </Suspense>
      {children}
    </>
  );
}
