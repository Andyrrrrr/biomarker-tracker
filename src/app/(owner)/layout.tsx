import { LogOut, Settings2 } from "lucide-react";
import Link from "next/link";
import { ExportMenu } from "@/components/export-menu";
import { SiteHeader, SiteMain } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { signOut } from "@/actions/auth";
import { signInSkipped } from "@/lib/owner";

// The owner's pages. Access is checked where each page reads data (requireOwner), not here: a
// layout doesn't re-run on every navigation, so it can't be the gate.
export default function OwnerLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader>
        {signInSkipped() && (
          <span className="rounded-full border border-dashed px-2.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground" title="DEV_SKIP_SIGN_IN is on in .env.local">
            Sign-in skipped
          </span>
        )}
        <ExportMenu />
        {/* Labels show from sm up; below that the icons carry an aria-label. */}
        <Button variant="ghost" nativeButton={false} aria-label="Manage" render={<Link href="/manage" />}>
          <Settings2 /> <span className="hidden sm:inline">Manage</span>
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="ghost" aria-label="Sign out">
            <LogOut /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </form>
      </SiteHeader>
      <SiteMain>{children}</SiteMain>
    </>
  );
}
