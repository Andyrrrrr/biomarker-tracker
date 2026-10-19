import { Trash2 } from "lucide-react";
import { Suspense } from "react";
import { deleteShareLinkAction, revokeShareLinkAction } from "@/actions/sharing";
import { LocalTime } from "@/components/local-time";
import { ConfirmButton } from "@/components/manage/confirm-button";
import { CopyLinkButton } from "@/components/manage/copy-link-button";
import { NewShareForm } from "@/components/manage/new-share-form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadShareLinks } from "@/lib/data";
import { shareStatus, type ShareStatus } from "@/sharing/links";

export const metadata = { title: "Sharing" };

export default function SharingPage() {
  return (
    <>
      <h1 className="pt-6 text-3xl font-semibold tracking-tight">Sharing</h1>
      <p className="max-w-2xl pt-2 pb-6 text-sm text-muted-foreground">
        A share link shows everything here, read-only, to anyone who has it, until it expires or you
        revoke it. Send it only to the person it&apos;s for.
      </p>
      <NewShareForm />
      <h2 className="pt-10 pb-2 text-lg font-semibold">Links</h2>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <LinkList />
      </Suspense>
    </>
  );
}

const STATUS: Record<ShareStatus, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  active: { label: "Active", variant: "secondary" },
  expired: { label: "Expired", variant: "outline" },
  revoked: { label: "Revoked", variant: "destructive" },
};

async function LinkList() {
  const links = await loadShareLinks();
  if (!links.length) return <p className="border-t py-8 text-sm text-muted-foreground">No links yet.</p>;
  const now = new Date();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>For</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Created</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="hidden md:table-cell">Last opened</TableHead>
          <TableHead className="hidden md:table-cell text-right">Opens</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {links.map((link) => {
          const status = shareStatus(link, now);
          const endsAt = link.revokedAt ?? link.expiresAt;
          return (
            <TableRow key={link.id}>
              <TableCell className="font-medium whitespace-normal">{link.label}</TableCell>
              <TableCell>
                <Badge variant={STATUS[status].variant}>{STATUS[status].label}</Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell"><LocalTime value={link.createdAt} /></TableCell>
              <TableCell className="text-muted-foreground">
                {endsAt ? <LocalTime value={endsAt} /> : "Never"}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {link.lastOpenedAt ? <LocalTime value={link.lastOpenedAt} format="dateTime" /> : "Never"}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">{link.openCount}</TableCell>
              <TableCell className="text-right">
                {status === "active" && (
                  <span className="inline-flex gap-1">
                    {link.token && <CopyLinkButton token={link.token} label={link.label} />}
                    <ConfirmButton
                      action={revokeShareLinkAction.bind(null, link.id)}
                      title={`Revoke the link for ${link.label}?`}
                      description="It stops working immediately. You can't turn it back on, but you can create a new one."
                      confirm="Revoke"
                      variant="outline"
                      size="sm"
                    >
                      Revoke
                    </ConfirmButton>
                  </span>
                )}
                {status !== "active" && (
                  <ConfirmButton
                    action={deleteShareLinkAction.bind(null, link.id)}
                    title={`Delete the link for ${link.label}?`}
                    description="It comes off this list for good, along with its open count. It already doesn't work."
                    confirm="Delete"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete the link for ${link.label}`}
                  >
                    <Trash2 />
                  </ConfirmButton>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
