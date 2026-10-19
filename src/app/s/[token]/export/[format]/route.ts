import { exportResponse } from "@/export/respond";
import { loadSharedDashboard } from "@/lib/data";

// A share link's download, the same as the owner's. Downloads don't count as opens.
export async function GET(_request: Request, ctx: RouteContext<"/s/[token]/export/[format]">) {
  const { token, format } = await ctx.params;
  const data = await loadSharedDashboard(token);
  if (!data) return new Response("Not found", { status: 404 });
  return exportResponse(format, data);
}
