import { Suspense } from "react";
import { DataView } from "@/components/views/data-view";
import { loadDashboard } from "@/lib/data";

export default function DataPage() {
  return (
    <div className="pt-6">
      {/* No visible title: the search row leads the page. Kept for screen readers. */}
      <h1 className="sr-only">Data</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading results…</p>}>
        <Data />
      </Suspense>
    </div>
  );
}

async function Data() {
  return <DataView data={await loadDashboard()} />;
}
