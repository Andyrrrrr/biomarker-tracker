import { exportResponse } from "@/export/respond";
import { loadDashboard } from "@/lib/data";

// The owner's download of every result, as CSV or PDF. loadDashboard checks access.
export async function GET(_request: Request, ctx: RouteContext<"/export/[format]">) {
  const { format } = await ctx.params;
  return exportResponse(format, await loadDashboard());
}
