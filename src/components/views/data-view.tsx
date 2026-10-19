import { Dashboard } from "@/components/dashboard";
import type { Dashboard as DashboardData } from "@/lib/data";

// The Data page body, shared by the owner's "/" and a share link's "/s/<token>".
export function DataView({ data, basePath = "" }: { data: DashboardData; basePath?: string }) {
  if (!data.markers.length) {
    return <p className="border-t py-12 text-sm text-muted-foreground">No results yet.</p>;
  }
  return <Dashboard categories={data.categories} markers={data.markers} basePath={basePath} />;
}
