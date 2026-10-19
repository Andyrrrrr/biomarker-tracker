import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LocalTime } from "@/components/local-time";
import { DataView } from "@/components/views/data-view";
import { loadSharedDashboard } from "@/lib/data";

export default function SharedDataPage({ params }: PageProps<"/s/[token]">) {
  return (
    <Suspense fallback={<p className="pt-6 text-sm text-muted-foreground">Loading results…</p>}>
      <SharedData params={params} />
    </Suspense>
  );
}

async function SharedData({ params }: Pick<PageProps<"/s/[token]">, "params">) {
  const { token } = await params;
  const data = await loadSharedDashboard(token, { recordOpen: true });
  if (!data) notFound();
  return (
    <>
      <h1 className="pt-6 text-3xl font-semibold tracking-tight">Lab results</h1>
      <p className="pt-2 pb-6 text-sm text-muted-foreground">
        Shared for {data.link.label}.{" "}
        {data.link.expiresAt ? (
          <>
            This link expires <LocalTime value={data.link.expiresAt} />.
          </>
        ) : (
          "This link doesn't expire."
        )}
      </p>
      <DataView data={data} basePath={`/s/${token}`} />
    </>
  );
}
