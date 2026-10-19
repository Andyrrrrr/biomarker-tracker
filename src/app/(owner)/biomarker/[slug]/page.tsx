import { Suspense } from "react";
import { BiomarkerView } from "@/components/views/biomarker-view";
import { loadDashboard } from "@/lib/data";

export default function BiomarkerPage({ params }: PageProps<"/biomarker/[slug]">) {
  return (
    <Suspense fallback={<p className="pt-6 text-sm text-muted-foreground">Loading…</p>}>
      <Biomarker params={params} />
    </Suspense>
  );
}

async function Biomarker({ params }: Pick<PageProps<"/biomarker/[slug]">, "params">) {
  const { slug } = await params;
  return <BiomarkerView data={await loadDashboard()} slug={slug} canEdit />;
}
