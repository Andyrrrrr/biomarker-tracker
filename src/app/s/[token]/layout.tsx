import type { Metadata } from "next";
import { Suspense } from "react";
import { ExportMenu } from "@/components/export-menu";
import { SiteHeader, SiteMain } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Shared results",
  robots: { index: false, follow: false },
};

// A share link's pages: the same views as the owner's, read-only, with links kept under
// /s/<token>. Each page checks the token itself (loadSharedDashboard); this layout doesn't gate.
export default function ShareLayout({ children, params }: LayoutProps<"/s/[token]">) {
  return (
    <>
      <Suspense fallback={<SiteHeader home="#" />}>
        <ShareHeader params={params} />
      </Suspense>
      <SiteMain>{children}</SiteMain>
    </>
  );
}

async function ShareHeader({ params }: Pick<LayoutProps<"/s/[token]">, "params">) {
  const { token } = await params;
  return (
    <SiteHeader home={`/s/${token}`}>
      <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">Shared · read-only</span>
      <ExportMenu basePath={`/s/${token}`} />
    </SiteHeader>
  );
}
