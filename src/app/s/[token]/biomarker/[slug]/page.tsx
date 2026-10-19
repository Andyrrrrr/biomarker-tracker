import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BiomarkerView } from "@/components/views/biomarker-view";
import { loadSharedDashboard } from "@/lib/data";

export default function SharedBiomarkerPage({ params }: PageProps<"/s/[token]/biomarker/[slug]">) {
  return (
    <Suspense fallback={<p className="pt-6 text-sm text-muted-foreground">Loading…</p>}>
      <SharedBiomarker params={params} />
    </Suspense>
  );
}

async function SharedBiomarker({ params }: Pick<PageProps<"/s/[token]/biomarker/[slug]">, "params">) {
  const { token, slug } = await params;
  const data = await loadSharedDashboard(token);
  if (!data) notFound();
  return <BiomarkerView data={data} slug={slug} basePath={`/s/${token}`} />;
}
